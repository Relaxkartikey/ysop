CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  provider text NOT NULL DEFAULT 'supabase',
  storage_key text NOT NULL,
  downloads integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  guest_id text
);

CREATE INDEX files_user_id_idx ON public.files (user_id);
CREATE INDEX files_guest_id_idx ON public.files (guest_id);
CREATE INDEX files_expires_at_idx ON public.files (expires_at);

GRANT SELECT ON public.files TO anon, authenticated;
GRANT ALL ON public.files TO service_role;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired files"
ON public.files FOR SELECT
TO anon, authenticated
USING (expires_at > now());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER files_set_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();