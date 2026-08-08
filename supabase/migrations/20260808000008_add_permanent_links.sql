alter table public.files
  alter column expires_at drop not null,
  add column if not exists is_permanent boolean not null default false;
