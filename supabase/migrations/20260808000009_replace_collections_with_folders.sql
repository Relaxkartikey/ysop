create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.folders enable row level security;
create policy "folders_owner_all" on public.folders
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create index if not exists folders_owner_user_id_idx on public.folders (owner_user_id);

alter table public.files
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists files_folder_id_idx on public.files (folder_id);

alter table public.files drop constraint if exists files_collection_id_fkey;
alter table public.files drop column if exists collection_id;
drop table if exists public.collections;
