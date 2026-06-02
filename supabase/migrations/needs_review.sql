-- Flag products touched by an inventory import so the admin can review the
-- quantity change / new-product creation before publishing.
alter table products add column if not exists needs_review boolean not null default false;
