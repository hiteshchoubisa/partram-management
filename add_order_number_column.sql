-- Add order_number column to orders table
-- This allows us to use shorter, more readable order IDs like "ORD-A1B2C3"

-- Add the order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Create an index for faster lookups by order number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- Optional: Add a unique constraint to ensure order numbers are unique
-- ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Optional: Add a check constraint to ensure order numbers follow the pattern
-- ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_format 
-- CHECK (order_number ~ '^[A-Z]{3}-[A-Z0-9]{6}$');

-- Note: Run this SQL in your Supabase SQL editor or via psql
-- The order_number field will be optional initially to maintain backward compatibility
