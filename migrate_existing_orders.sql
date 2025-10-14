-- Migration script to add order_number column and populate existing orders
-- Run this in your Supabase SQL editor

-- Step 1: Add the order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- Step 3: Generate short order numbers for existing orders
-- This will create order numbers like ORD-A1B2C3, ORD-X9Y8Z7, etc.
UPDATE public.orders 
SET order_number = 'ORD-' || 
  CASE 
    WHEN id = '0160db25-6762-4061-b820-88ff50ad6903' THEN 'A1B2C3'
    WHEN id = '03956b94-8bdf-4459-8e0e-19cd0eb2fefa' THEN 'B2C3D4'
    WHEN id = '044f31a2-1568-4dcd-a9dd-d1e9fb72d3ab' THEN 'C3D4E5'
    WHEN id = '069846d6-63b6-4c5d-8634-dfe9bac6e500' THEN 'D4E5F6'
    WHEN id = '14a0e863-6687-427f-a0e8-26de39f08699' THEN 'E5F6G7'
    WHEN id = '19b2b466-8aaa-4220-9fe2-21e5e18780d5' THEN 'F6G7H8'
    WHEN id = '1e71236d-76aa-4169-9faa-e78a6712d038' THEN 'G7H8I9'
    WHEN id = '347291fc-370e-4ecc-a114-85c6537bf8c4' THEN 'H8I9J0'
    WHEN id = '3f2799df-6b49-4d13-817c-6e679451d614' THEN 'I9J0K1'
    WHEN id = '43647ac6-2ce3-4ab1-92ac-c2b57a623a49' THEN 'J0K1L2'
    WHEN id = '47bf87d4-6211-448c-b93d-fd7c5cbb0940' THEN 'K1L2M3'
    WHEN id = '4909faa7-e417-4d81-aab3-1664d8e08e23' THEN 'L2M3N4'
    WHEN id = '4d502ef7-ed8e-41f7-8ff5-e6d56cd831eb' THEN 'M3N4O5'
    WHEN id = '4f79bcf7-42b4-42a3-929a-bd8fb222cb39' THEN 'N4O5P6'
    WHEN id = '53382e1a-46bb-4f3f-9d1b-60d923ef9b51' THEN 'O5P6Q7'
    WHEN id = '546a1dc4-d557-48be-8636-0e3d04af05b3' THEN 'P6Q7R8'
    WHEN id = '58115fae-5f70-4196-a9bd-956e96efccbb' THEN 'Q7R8S9'
    WHEN id = '609b512a-df16-4cf7-8a83-29f6568eebf8' THEN 'R8S9T0'
    WHEN id = '655b6859-8ab6-4543-bd3b-83605a2b270e' THEN 'S9T0U1'
    WHEN id = '6d1757c3-01cb-4166-aced-f4f7d0d2051f' THEN 'T0U1V2'
    WHEN id = '79c9e92f-fc71-445d-ada8-b385819e3ace' THEN 'U1V2W3'
    WHEN id = '7a32064d-fab3-42c2-9c90-6629673e5662' THEN 'V2W3X4'
    WHEN id = '7ceed419-3872-4701-9788-9aa7bb52b883' THEN 'W3X4Y5'
    WHEN id = '83be9c47-0f07-4bfc-8050-18cd2dfe769d' THEN 'X4Y5Z6'
    WHEN id = '87bc89d7-a206-4681-8a20-ba1b0ea2f08c' THEN 'Y5Z6A7'
    WHEN id = '88c7abbd-42cf-4d81-9224-c645f3c09e30' THEN 'Z6A7B8'
    WHEN id = 'a2e2c54d-736b-449b-b895-33142610b651' THEN 'A7B8C9'
    WHEN id = 'a5a7be53-42fa-434f-a83a-40275721b285' THEN 'B8C9D0'
    WHEN id = 'a813896f-bc40-413e-8c62-186dc7e4f0ed' THEN 'C9D0E1'
    WHEN id = 'ae9f76a0-a629-40cd-97eb-98fcd189aa63' THEN 'D0E1F2'
    WHEN id = 'b1258256-f6f6-4c42-907d-7c05e88c3295' THEN 'E1F2G3'
    WHEN id = 'b5de646d-6d83-4ad4-be83-982f86b4c1b8' THEN 'F2G3H4'
    WHEN id = 'b9f91f2b-0c58-4575-bcad-dc81c5d06e14' THEN 'G3H4I5'
    WHEN id = 'ba2cbce5-2c18-4c44-bc3f-4fef9364b2c0' THEN 'H4I5J6'
    WHEN id = 'bebb4aa7-96bc-4de1-8eb5-34f4d7b87e1f' THEN 'I5J6K7'
    WHEN id = 'bfbd0487-ddc4-4e5f-87a2-70042b775b09' THEN 'J6K7L8'
    WHEN id = 'cd6b7746-578d-4980-b7e5-0b51aa9f7c4c' THEN 'K7L8M9'
    WHEN id = 'cf41ebec-7fde-4d2c-8f5a-cb58877e5e96' THEN 'L8M9N0'
    WHEN id = 'd0c1b93c-fac1-4867-9cc1-01928c5ef0d9' THEN 'M9N0O1'
    WHEN id = 'd4d91f7f-a477-40aa-a7c0-38c8be151bf1' THEN 'N0O1P2'
    WHEN id = 'd76ec6de-9492-4025-b41b-8b82ef7cb6b4' THEN 'O1P2Q3'
    WHEN id = 'da46b1db-a72b-474f-8bf6-484f859c0c7d' THEN 'P2Q3R4'
    WHEN id = 'db51903d-0f2f-4d84-ac36-deb714346651' THEN 'Q3R4S5'
    WHEN id = 'de87f82c-62cf-4d40-aa17-e63df8c386c2' THEN 'R4S5T6'
    WHEN id = 'dfdf98fd-5422-4e8a-9258-a526a85cbfad' THEN 'S5T6U7'
    WHEN id = 'e666690d-43c8-4fd9-b71f-6ed5ee671ded' THEN 'T6U7V8'
    WHEN id = 'f219d16a-6f5c-4267-88a5-0dcf36dfdbf0' THEN 'U7V8W9'
    WHEN id = 'fd389eee-ae11-4bc2-99d8-1947148fcfc6' THEN 'V8W9X0'
    ELSE 'ORD-' || substring(id, 1, 6)
  END
WHERE order_number IS NULL;

-- Step 4: Verify the update
SELECT id, order_number, client, status 
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Optional: Add unique constraint to ensure order numbers are unique
-- ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
