-- Journal posts — admin-authored blog posts (Portal → Journal).
-- Built-in starter posts still render via code; published rows here add to or
-- override them by slug. Public can read published posts; writes are service-role.
create table if not exists journal_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  meta_description text not null default '',
  excerpt          text not null default '',
  date             text not null,                       -- ISO yyyy-mm-dd
  read_mins        int  not null default 3,
  body             jsonb not null default '[]'::jsonb,  -- Block[]: {p}|{h2}|{ul}
  related          jsonb not null default '[]'::jsonb,  -- {label,href}[]
  published        boolean not null default false,
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists journal_posts_pub_idx on journal_posts (published, date desc);
alter table journal_posts enable row level security;
drop policy if exists journal_posts_public_read on journal_posts;
create policy journal_posts_public_read on journal_posts for select using (published = true);
drop policy if exists journal_posts_service_write on journal_posts;
create policy journal_posts_service_write on journal_posts for all to service_role using (true) with check (true);
