-- Update admin password to a simple password for testing
-- Run this in your Supabase SQL editor

-- Option 1: Set password to "admin123" (plain text)
UPDATE "public"."users" 
SET password_hash = 'admin123' 
WHERE email = 'hitesh.choubisa123@gmail.com';

-- Option 2: Set password to "password" (plain text)
-- UPDATE "public"."users" 
-- SET password_hash = 'password' 
-- WHERE email = 'hitesh.choubisa123@gmail.com';

-- Option 3: Set password to "hitesh123" (plain text)
-- UPDATE "public"."users" 
-- SET password_hash = 'hitesh123' 
-- WHERE email = 'hitesh.choubisa123@gmail.com';

-- Verify the update
SELECT id, name, email, password_hash, role FROM "public"."users" WHERE email = 'hitesh.choubisa123@gmail.com';
