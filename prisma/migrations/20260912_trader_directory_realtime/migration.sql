-- Let authenticated dashboard clients observe publication changes made by admins.
-- RLS still limits reads to active, published trader profiles.
GRANT SELECT ON TABLE public.copy_traders TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'copy_traders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_traders;
  END IF;
END
$$;
