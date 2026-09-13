-- ==========================================================
-- CRYPTOINDEXASSET - SUPABASE STORAGE BUCKETS & RLS POLICIES
-- ==========================================================

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('public-traders', 'public-traders', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('private-kyc', 'private-kyc', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('private-proofs', 'private-proofs', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public read policy for public-traders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_traders_select'
  ) THEN
    CREATE POLICY "public_traders_select" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'public-traders');
  END IF;
END $$;

-- 3. Owner upload policies for private KYC documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'kyc_insert_authenticated'
  ) THEN
    CREATE POLICY "kyc_insert_authenticated" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'private-kyc'
      );
  END IF;
END $$;

-- 4. Owner upload policies for private deposit proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'proofs_insert_authenticated'
  ) THEN
    CREATE POLICY "proofs_insert_authenticated" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'private-proofs'
      );
  END IF;
END $$;

-- 5. Service role full access to all buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'service_role_all_storage'
  ) THEN
    CREATE POLICY "service_role_all_storage" ON storage.objects
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;
