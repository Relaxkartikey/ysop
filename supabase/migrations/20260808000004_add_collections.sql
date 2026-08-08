create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "collections_owner_all" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.files
  add column if not exists collection_id uuid references public.collections(id) on delete set null;

create index if not exists files_collection_id_idx on public.files (collection_id);
create index if not exists collections_user_id_idx on public.collections (user_id);
