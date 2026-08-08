alter table public.folders
  add column if not exists parent_folder_id uuid references public.folders(id) on delete set null;

create index if not exists folders_parent_folder_id_idx on public.folders (parent_folder_id);
