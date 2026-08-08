-- Pin search_path on all billing RPCs so they can't be hijacked by a session that has
-- created objects earlier in the search path than `public`.
alter function public.billing_activate_pro(uuid, text, uuid, timestamptz, timestamptz) set search_path = public;
alter function public.billing_downgrade_to_free(uuid, text) set search_path = public;
alter function public.billing_cancel_subscription(uuid, boolean) set search_path = public;
alter function public.billing_expire_subscription(uuid) set search_path = public;
alter function public.billing_mark_past_due(uuid) set search_path = public;
alter function public.billing_recover_subscription(uuid, timestamptz) set search_path = public;

-- auth.uid() re-evaluates per row unless wrapped in a subselect, which Postgres can
-- then treat as a stable InitPlan evaluated once per statement.
drop policy if exists "folders_owner_all" on public.folders;
create policy "folders_owner_all" on public.folders
  for all using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "payments_owner_select" on public.payments;
create policy "payments_owner_select" on public.payments
  for select using ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_owner_select" on public.subscriptions;
create policy "subscriptions_owner_select" on public.subscriptions
  for select using ((select auth.uid()) = user_id);

drop policy if exists "user_plans_owner_select" on public.user_plans;
create policy "user_plans_owner_select" on public.user_plans
  for select using ((select auth.uid()) = user_id);

drop policy if exists "storage_nodes_owner_select" on public.storage_nodes;
create policy "storage_nodes_owner_select" on public.storage_nodes
  for select using (is_platform_node = true or owner_user_id = (select auth.uid()));

-- Covering indexes for FKs the linter flagged.
create index if not exists audit_log_actor_user_id_idx on public.audit_log(actor_user_id);
create index if not exists payments_subscription_id_idx on public.payments(subscription_id);
create index if not exists user_plans_preferred_storage_node_id_idx on public.user_plans(preferred_storage_node_id);
