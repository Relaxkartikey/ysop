alter table public.folders add column if not exists slug text;

update public.folders
set slug = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where slug is null;

alter table public.folders
  alter column slug set not null,
  add constraint folders_slug_key unique (slug);
