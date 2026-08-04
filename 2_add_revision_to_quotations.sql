-- Migration to add revision_number column to quotations table
-- Run this in the Supabase SQL Editor if not already present

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;
