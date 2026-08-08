-- Guest ownership is removed; orphaned guest-owned test rows have no owner to migrate to.
delete from public.files where user_id is null;

alter table public.files
  alter column user_id set not null,
  drop column if exists guest_id;

drop index if exists public.files_guest_id_idx;
