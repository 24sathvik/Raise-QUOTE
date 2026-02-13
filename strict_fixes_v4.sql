-- STRICT FIXES V4 - FINAL ROBUST RLS
-- This script fixes "Unauthorized" by ensuring recursive checks are impossible
-- and "All Quotations Visible" by forcing strict policy evaluation.

-- 1. SECURITY DEFINER FUNCTION (The Foundation)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Bypasses RLS to read profiles safely
SET search_path = public -- Sandbox execution
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execution to everyone (authenticated)
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;

-- 2. QUOTATIONS (Strict Enforcement)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY; -- Critical for preventing leaks

DROP POLICY IF EXISTS "Users view own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admin view all quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users insert own quotations" ON public.quotations;

CREATE POLICY "Users view own quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
);

CREATE POLICY "Admin view all quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  is_admin()
);

CREATE POLICY "Users insert own quotations"
ON public.quotations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- 3. PROFILES (Users) (Strict Enforcement)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users view self" ON public.profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;

-- Admin can do ANYTHING
CREATE POLICY "Admin full access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  is_admin()
);

-- Users can see themselves (Critical for is_admin to validly check non-privileged access?) 
-- Actually is_admin BYPASSES this. But the app needs to read the user's own name/role.
CREATE POLICY "Users view self"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- 4. CLEANUP & RELOAD
NOTIFY pgrst, 'reload schema';
