-- Fix "Seep Mask" → "Sleep Mask" typo in product names.
-- Safe to re-run (ILIKE '%seep mask%' will match nothing after the first run).

UPDATE products
SET name = REPLACE(name, 'Seep Mask', 'Sleep Mask')
WHERE name ILIKE '%seep mask%';

-- If the product ID is a text slug containing 'seep-mask', the slug needs
-- manual correction in Supabase Dashboard (changing a primary key requires
-- cascading updates to all FK-referencing tables — do not do this blind).
-- Run the query below first to see if any such slugs exist:
--   SELECT id, name FROM products WHERE id ILIKE '%seep%';
-- If found, update the slug manually and add the old slug to the redirects
-- in next.config.ts.
