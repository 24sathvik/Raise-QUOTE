-- Migration: Create and configure the 'quotations' storage bucket for PDF storage
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotations', 'quotations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload PDFs to the quotations bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload quotation PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quotations');

-- 3. Allow anyone to read/download PDFs (public bucket)
CREATE POLICY IF NOT EXISTS "Public can read quotation PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quotations');

-- 4. Allow authenticated users to delete their own PDFs
CREATE POLICY IF NOT EXISTS "Authenticated users can delete quotation PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quotations');
