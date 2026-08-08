CREATE TABLE public.storage_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  bucket text,
  region text,
  priority integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  max_file_size bigint,
  quota bigint,
  current_usage bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.storage_nodes TO service_role;
ALTER TABLE public.storage_nodes ENABLE ROW LEVEL SECURITY;
-- Only the service role (server-side) ever reads this table; no anon/authenticated policy needed.

INSERT INTO public.storage_nodes (name, provider, bucket, priority, enabled, is_default)
VALUES ('Supabase Main', 'supabase', 'files', 0, true, true);

ALTER TABLE public.files
  ADD COLUMN storage_node_id uuid REFERENCES public.storage_nodes(id);

UPDATE public.files
SET storage_node_id = (SELECT id FROM public.storage_nodes WHERE is_default = true LIMIT 1)
WHERE storage_node_id IS NULL;

CREATE INDEX files_storage_node_id_idx ON public.files (storage_node_id);
