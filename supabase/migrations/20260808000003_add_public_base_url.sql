ALTER TABLE public.storage_nodes ADD COLUMN public_base_url text;

UPDATE public.storage_nodes
SET public_base_url = 'https://pub-866ca06212c64a198cd1b3544b63b267.r2.dev'
WHERE name = 'R2 Main';
