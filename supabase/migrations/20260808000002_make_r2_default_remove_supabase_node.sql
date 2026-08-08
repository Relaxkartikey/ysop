UPDATE public.storage_nodes SET is_default = true, priority = 0 WHERE name = 'R2 Main';
DELETE FROM public.storage_nodes WHERE name = 'Supabase Main';
