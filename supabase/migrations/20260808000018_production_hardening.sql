-- Missing indexes on hot lookup paths (webhook processing, expiry checks).
create index if not exists payments_provider_order_id_idx
  on public.payments(provider, provider_order_id)
  where provider_order_id is not null;

create index if not exists user_plans_subscription_id_idx
  on public.user_plans(subscription_id)
  where subscription_id is not null;

-- `expires_at > now()` evaluates to NULL (i.e. false) for permanent files, which have
-- expires_at = NULL by design. Match the app's own "active" filter: permanent OR not yet expired.
drop policy if exists "Anyone can view non-expired files" on public.files;
create policy "files_public_select_active" on public.files
  for select using (is_permanent = true or expires_at > now());
