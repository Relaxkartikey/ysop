create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  preferred_storage_node_id uuid references public.storage_nodes(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;

create policy "user_plans_owner_select" on public.user_plans
  for select using (auth.uid() = user_id);
