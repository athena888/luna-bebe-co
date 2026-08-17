-- 54) Review photos: reviews.image_url renders in the on-site review carousel
--     and the portal moderation list. Photos upload to the PUBLIC
--     review-images bucket (served directly on product pages). Idempotent.

alter table reviews add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

-- Done.
