-- Recurring relationship: one row per subscription lifecycle (pending -> active -> ... -> expired/cancelled).
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mock',
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null default 'pro' check (plan in ('free', 'pro')),
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_owner_select" on public.subscriptions
  for select using (auth.uid() = user_id);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create unique index if not exists subscriptions_provider_sub_id_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- user_plans stays the single, cheap-to-read entitlement snapshot every feature check hits.
alter table public.user_plans
  add column if not exists source text not null default 'default' check (source in ('default', 'subscription', 'manual', 'dev')),
  add column if not exists status text,
  add column if not exists expires_at timestamptz,
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

-- Individual transactions, distinct from the recurring `subscriptions` relationship.
alter table public.payments
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null,
  add column if not exists provider_order_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists payments_provider_payment_id_idx
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

-- ---------------------------------------------------------------------------
-- Billing transitions: each function performs its multi-table entitlement
-- update atomically. These are the only writers of `subscriptions.status` /
-- `user_plans.plan` past initial creation — billing.service.ts calls them via rpc().
-- ---------------------------------------------------------------------------

create or replace function public.billing_activate_pro(
  p_user_id uuid,
  p_source text,
  p_subscription_id uuid default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null
) returns void
language plpgsql
as $$
begin
  if p_subscription_id is not null then
    update public.subscriptions
    set status = 'active',
        plan = 'pro',
        current_period_start = coalesce(p_period_start, current_period_start, now()),
        current_period_end = coalesce(p_period_end, current_period_end),
        updated_at = now()
    where id = p_subscription_id;
  end if;

  insert into public.user_plans (user_id, plan, source, status, expires_at, subscription_id, updated_at)
  values (p_user_id, 'pro', p_source, 'active', p_period_end, p_subscription_id, now())
  on conflict (user_id) do update
  set plan = 'pro',
      source = p_source,
      status = 'active',
      expires_at = p_period_end,
      subscription_id = p_subscription_id,
      updated_at = now();
end;
$$;

create or replace function public.billing_downgrade_to_free(
  p_user_id uuid,
  p_source text default 'default'
) returns void
language plpgsql
as $$
begin
  insert into public.user_plans (user_id, plan, source, status, expires_at, subscription_id, updated_at)
  values (p_user_id, 'free', p_source, null, null, null, now())
  on conflict (user_id) do update
  set plan = 'free',
      source = p_source,
      status = null,
      expires_at = null,
      subscription_id = null,
      updated_at = now();
end;
$$;

create or replace function public.billing_cancel_subscription(
  p_subscription_id uuid,
  p_cancel_at_period_end boolean
) returns void
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.subscriptions where id = p_subscription_id;
  if v_user_id is null then
    raise exception 'Subscription % not found', p_subscription_id;
  end if;

  if p_cancel_at_period_end then
    update public.subscriptions
    set cancel_at_period_end = true, cancelled_at = now(), updated_at = now()
    where id = p_subscription_id;
    -- entitlement stays active until billing_expire_subscription runs at period end
  else
    update public.subscriptions
    set status = 'cancelled', cancel_at_period_end = false, cancelled_at = now(), updated_at = now()
    where id = p_subscription_id;

    update public.user_plans
    set plan = 'free', source = 'default', status = null, expires_at = null, subscription_id = null, updated_at = now()
    where subscription_id = p_subscription_id;
  end if;
end;
$$;

create or replace function public.billing_expire_subscription(
  p_subscription_id uuid
) returns void
language plpgsql
as $$
begin
  update public.subscriptions
  set status = 'expired', updated_at = now()
  where id = p_subscription_id;

  -- only downgrade if this is still the entitlement's current subscription
  -- (guards against a newer subscription already having taken over)
  update public.user_plans
  set plan = 'free', source = 'default', status = null, expires_at = null, subscription_id = null, updated_at = now()
  where subscription_id = p_subscription_id;
end;
$$;

create or replace function public.billing_mark_past_due(
  p_subscription_id uuid
) returns void
language plpgsql
as $$
begin
  update public.subscriptions
  set status = 'past_due', updated_at = now()
  where id = p_subscription_id;

  -- entitlement is not revoked immediately; the grace period lives in user_plans.status
  update public.user_plans
  set status = 'past_due', updated_at = now()
  where subscription_id = p_subscription_id;
end;
$$;

create or replace function public.billing_recover_subscription(
  p_subscription_id uuid,
  p_period_end timestamptz
) returns void
language plpgsql
as $$
begin
  update public.subscriptions
  set status = 'active', current_period_end = p_period_end, updated_at = now()
  where id = p_subscription_id;

  update public.user_plans
  set status = 'active', expires_at = p_period_end, updated_at = now()
  where subscription_id = p_subscription_id;
end;
$$;
