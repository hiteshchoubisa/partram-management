-- Fix order numbers in Supabase
-- Run this in your Supabase SQL Editor

-- Step 1: Check current state
SELECT 
  id,
  order_number,
  client,
  order_date,
  created_at
FROM public.orders 
WHERE order_number IS NULL
LIMIT 5;

-- Step 2: Update orders with NULL order_number
-- Using a simpler approach with a temporary sequence
UPDATE public.orders 
SET order_number = 'ORD-' || 
  TO_CHAR(order_date, 'YYYYMMDD') || '-' ||
  LPAD(
    (SELECT COUNT(*) + 1 
     FROM public.orders o2 
     WHERE o2.created_at < orders.created_at 
     AND o2.order_number IS NOT NULL
    )::TEXT, 
    4, '0'
  )
WHERE order_number IS NULL;

-- Step 3: Alternative approach if above doesn't work
-- Uncomment and run this if the above fails:
/*
UPDATE public.orders 
SET order_number = 'ORD-' || 
  TO_CHAR(order_date, 'YYYYMMDD') || '-' ||
  LPAD(EXTRACT(EPOCH FROM created_at)::INTEGER % 10000, 4, '0')
WHERE order_number IS NULL;
*/

-- Step 4: Verify the update
SELECT 
  id,
  order_number,
  client,
  order_date,
  created_at
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 5: Check for any remaining NULL values
SELECT COUNT(*) as null_order_numbers
FROM public.orders 
WHERE order_number IS NULL;
