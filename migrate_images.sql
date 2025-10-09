-- Add images column to store multiple image URLs as JSON array
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Update existing products to move photo_url to images array
UPDATE products 
SET images = CASE 
  WHEN photo_url IS NOT NULL AND photo_url != '' 
  THEN jsonb_build_array(photo_url)
  ELSE '[]'::jsonb
END
WHERE images IS NULL OR images = '[]'::jsonb;

-- Create index for better performance on images queries
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN (images);

SELECT 'Images column added successfully! ✅' as status;
