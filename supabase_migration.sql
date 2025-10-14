-- Supabase Migration: Add order_number column to orders table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Create index for faster lookups by order number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- Step 3: Generate short order numbers for existing orders
-- Using a more systematic approach with row_number() for unique IDs
WITH order_updates AS (
  SELECT 
    id,
    'ORD-' || 
    CASE 
      WHEN row_number() OVER (ORDER BY created_at) <= 26 THEN
        CHR(65 + ((row_number() OVER (ORDER BY created_at) - 1) / 26)) ||
        CHR(65 + ((row_number() OVER (ORDER BY created_at) - 1) % 26)) ||
        LPAD(((row_number() OVER (ORDER BY created_at) - 1) % 100)::TEXT, 2, '0')
      ELSE
        'ORD-' || substring(id, 1, 6)
    END as new_order_number
  FROM public.orders 
  WHERE order_number IS NULL
)
UPDATE public.orders 
SET order_number = order_updates.new_order_number
FROM order_updates
WHERE orders.id = order_updates.id;

-- Step 4: Add unique constraint to prevent duplicate order numbers
ALTER TABLE public.orders 
ADD CONSTRAINT IF NOT EXISTS orders_order_number_unique UNIQUE (order_number);

-- Step 5: Verify the migration
SELECT 
  id,
  order_number,
  client,
  status,
  order_date,
  created_at
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 6: Check for any NULL order_numbers (should be 0)
SELECT COUNT(*) as null_order_numbers
FROM public.orders 
WHERE order_number IS NULL;

-- Optional: Create a function to generate order numbers for new orders
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the next available number
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.orders 
  WHERE order_number ~ '^ORD-[0-9]+$';
  
  -- Format as ORD-XXXXXX
  new_number := 'ORD-' || LPAD(counter::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to auto-generate order numbers for new orders
CREATE OR REPLACE FUNCTION auto_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_order_number ON public.orders;
CREATE TRIGGER trigger_auto_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_order_number();

-- Final verification: Show sample of updated orders
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as total_orders,
  COUNT(order_number) as orders_with_numbers,
  COUNT(*) - COUNT(order_number) as orders_without_numbers
FROM public.orders;
