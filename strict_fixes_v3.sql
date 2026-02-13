-- STRICT FIXES V3 - FIXING RLS RECURSION
-- Issue: Previous policies likely caused infinite recursion when checking 'role' on 'profiles' table.

-- 1. Helper Function to Avoid Recursion
-- This function runs with SECURITY DEFINER (bypass RLS) to safely check admin status.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. QUOTATIONS POLICIES (Updated to use is_admin where applicable)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admin view all quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users insert own quotations" ON public.quotations;

-- Users see own
CREATE POLICY "Users view own quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
);

-- Admin see all (using function to be safe)
CREATE POLICY "Admin view all quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- Users insert own
CREATE POLICY "Users insert own quotations"
ON public.quotations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- 3. PROFILES POLICIES (Recursion Fix)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop all previous policies
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users view self" ON public.profiles;
DROP POLICY IF EXISTS "Admin full read access users" ON public.profiles;

-- Admin Full Access (Select, Insert, Update, Delete)
-- Uses is_admin() to break recursion loop.
CREATE POLICY "Admin full access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  is_admin()
);

-- Users can view their own profile
CREATE POLICY "Users view self"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- 4. INSERT Policy for Admin (Explicit)
-- Ensure Admins can INSERT new profiles (Add User)
CREATE POLICY "Admin insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
);

NOTIFY pgrst, 'reload schema';
