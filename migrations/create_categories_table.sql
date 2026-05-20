-- Migration: Create categories table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS public.categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Allow authenticated users to read categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin service role full access (used by server actions)
CREATE POLICY "Allow service role full access" ON public.categories
  USING (true) WITH CHECK (true);
