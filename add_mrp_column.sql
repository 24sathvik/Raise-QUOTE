-- Add MRP column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS mrp NUMERIC DEFAULT 0;

-- Update RLS if necessary (usually ALTER TABLE handles it, but good to be safe)
-- No new RLS needed for just a column addition if existing policies cover 'products'.
