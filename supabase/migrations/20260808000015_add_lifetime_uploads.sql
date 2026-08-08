alter table public.user_plans
  add column if not exists lifetime_platform_uploads integer not null default 0;
