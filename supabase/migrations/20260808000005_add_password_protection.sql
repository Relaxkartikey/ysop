alter table public.files
  add column if not exists password_hash text;
