-- SEO fields for products: a robust title tag + meta description (keyword-led),
-- and FAQ Q&As used for FAQPage structured data. The on-page copy can stay
-- poetic; these power search/snippets.
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS faqs JSONB; -- [{ "q": "...", "a": "..." }]
