-- ----------------------------------------------------------------
-- CRITICAL FIXES FOR ADMIN PANEL
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ----------------------------------------------------------------

-- 1. FIX "Could not find the 'features' column"
-- We add 'features' column to 'products' table to support the code
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- 2. FIX "new row violates row-level security policy" (Image Uploads)
-- We insert a policy to allow authenticated users (Admins) to upload to 'products' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'products');

-- 3. FIX "new row violates row-level security policy" (Product Completion)
-- Ensure Admins can insert/update products
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
CREATE POLICY "Enable insert for authenticated users only" 
ON public.products 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.products;
CREATE POLICY "Enable update for authenticated users only" 
ON public.products 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. FIX "Unauthorized" in Users Section
-- Ensure profiles can be read by admins
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
