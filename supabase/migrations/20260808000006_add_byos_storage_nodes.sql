alter table public.storage_nodes
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists credentials text,
  add column if not exists is_platform_node boolean not null default true,
  add column if not exists display_name text;

update public.storage_nodes set is_platform_node = true where owner_user_id is null;

create index if not exists storage_nodes_owner_user_id_idx on public.storage_nodes (owner_user_id);

alter table public.storage_nodes enable row level security;

drop policy if exists "storage_nodes_owner_select" on public.storage_nodes;
create policy "storage_nodes_owner_select" on public.storage_nodes
  for select using (is_platform_node = true or owner_user_id = auth.uid());
