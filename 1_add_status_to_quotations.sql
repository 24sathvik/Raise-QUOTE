-- Migration to add status column to quotations table
-- Run this in the Supabase SQL Editor

-- 1. Create the enum for status
CREATE TYPE quotation_status AS ENUM ('pending', 'negotiating', 'approved', 'rejected', 'on_hold');

-- 2. Add the column to the table, defaulting to 'pending'
ALTER TABLE quotations ADD COLUMN status quotation_status DEFAULT 'pending' NOT NULL;
