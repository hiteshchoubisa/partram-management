-- Update orders table in Supabase
-- Run this in your Supabase SQL Editor

-- Step 1: Add the order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- Step 3: Generate order numbers for existing orders
-- Format: ORD-YYYYMMDD-XXXX
WITH numbered_orders AS (
  SELECT 
    id,
    'ORD-' || 
    TO_CHAR(order_date, 'YYYYMMDD') || '-' ||
    LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_order_number
  FROM public.orders 
  WHERE order_number IS NULL
)
UPDATE public.orders 
SET order_number = numbered_orders.new_order_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

-- Step 4: Add unique constraint (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_order_number_unique'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
    END IF;
END $$;

-- Step 5: Verify the update
SELECT 
  id,
  order_number,
  client,
  status,
  created_at
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 5;
