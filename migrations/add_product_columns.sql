-- Migration: Add missing JSONB columns to products table
-- Run this in Supabase Dashboard → SQL Editor
-- After running, go to: API tab → click "Reload schema cache"

ALTER TABLE products ADD COLUMN IF NOT EXISTS features      JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs         JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS addons        JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS line_items    JSONB DEFAULT '[]';

-- Verify columns were added:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('features', 'specs', 'addons', 'line_items')
ORDER BY column_name;
