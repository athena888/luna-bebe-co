-- ============================================================================
-- PENDING MIGRATIONS — paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once (everything uses IF NOT EXISTS / OR REPLACE).
-- Covers: managed site images, gallery hover pin, product SEO fields,
-- order special note, bestseller/organic flags, and rate limiting.
-- ============================================================================

-- 1) Managed standalone image slots (Story, Build banners, Guide, gift card, OG)
create table if not exists site_images (
  id          uuid primary key default gen_random_uuid(),
  slot_key    text not null,
  bucket      text not null default 'home-images',
  path        text not null,
  public_url  text not null,
  alt_text    text not null default '',
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);
create unique index if not exists site_images_slot_key_uniq on site_images (slot_key) where sort_order = 0;
create index if not exists site_images_slot_idx on site_images (slot_key, sort_order);
alter table site_images enable row level security;
drop policy if exists site_images_public_read on site_images;
create policy site_images_public_read on site_images for select using (true);
drop policy if exists site_images_service_write on site_images;
create policy site_images_service_write on site_images for all to service_role using (true) with check (true);

-- 2) Gallery hover pin (which image shows on card hover)
alter table product_gallery add column if not exists is_hover boolean not null default false;

-- 3) Product SEO fields (title tag, meta description, FAQ Q&As for FAQPage)
alter table products add column if not exists seo_title text;
alter table products add column if not exists seo_description text;
alter table products add column if not exists faqs jsonb; -- [{ "q": "...", "a": "..." }]

-- 4) Customer special request / note on an order
alter table orders add column if not exists special_note text;

-- 5) Curated Bestsellers + explicit organic flag
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists organic  boolean not null default false;

-- 6) Postgres-backed rate limiting
create table if not exists rate_limit_buckets (
  bucket_key   text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);
alter table rate_limit_buckets enable row level security;
drop policy if exists rate_limit_service on rate_limit_buckets;
create policy rate_limit_service on rate_limit_buckets
  for all to service_role using (true) with check (true);

create or replace function check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  insert into rate_limit_buckets (bucket_key, count, window_start)
    values (p_key, 1, now())
  on conflict (bucket_key) do update
    set
      count = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limit_buckets.count + 1
      end,
      window_start = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limit_buckets.window_start
      end
  returning count, window_start into v_count, v_start;

  return v_count <= p_limit;
end;
$$;

-- 7) Multiple photos per pre-built box (gallery)
alter table prebuilt_boxes add column if not exists images jsonb not null default '[]'::jsonb;

-- 8) Customizable printed card styles + per-order chosen style
create table if not exists card_styles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  alt_text    text not null default '',
  size_label  text not null default '',
  word_limit  int  not null default 100,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table card_styles enable row level security;
drop policy if exists card_styles_public_read on card_styles;
create policy card_styles_public_read on card_styles for select using (true);
drop policy if exists card_styles_service_write on card_styles;
create policy card_styles_service_write on card_styles for all to service_role using (true) with check (true);

alter table orders add column if not exists card_style text;

-- 9) FIX variant saving: remove stale RPC overloads, keep one canonical set.
alter table product_variants add column if not exists style text not null default '';
alter table product_variants drop constraint if exists product_variants_product_id_color_size_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_pcss_key') then
    alter table product_variants add constraint product_variants_pcss_key unique (product_id, color, size, style);
  end if;
end $$;
drop function if exists set_product_variant(text,text,text,integer,text,integer);
drop function if exists set_product_variant(text,text,text,integer,text,integer,text);
drop function if exists set_product_variant(text,text,text,integer,text,integer,text,text);
drop function if exists upsert_product_variant(text,text,text,integer);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer,text);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer,text,text);
drop function if exists decrement_variant(text,text,text);
drop function if exists decrement_variant(text,text,text,text);
create function upsert_product_variant(
  p_product_id text, p_color text, p_size text, p_quantity integer,
  p_color_hex text default null, p_unit_price integer default null,
  p_color_code text default null, p_style text default ''
) returns void as $$
begin
  insert into product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  values (p_product_id, p_color, p_size, coalesce(p_style,''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  on conflict (product_id, color, size, style) do update set
    quantity = product_variants.quantity + excluded.quantity,
    color_hex = coalesce(excluded.color_hex, product_variants.color_hex),
    unit_price = coalesce(excluded.unit_price, product_variants.unit_price),
    color_code = coalesce(excluded.color_code, product_variants.color_code),
    updated_at = now();
end; $$ language plpgsql security definer;
create function set_product_variant(
  p_product_id text, p_color text, p_size text, p_quantity integer,
  p_color_hex text default null, p_unit_price integer default null,
  p_color_code text default null, p_style text default ''
) returns void as $$
begin
  insert into product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  values (p_product_id, p_color, p_size, coalesce(p_style,''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  on conflict (product_id, color, size, style) do update set
    quantity = excluded.quantity,
    color_hex = coalesce(excluded.color_hex, product_variants.color_hex),
    unit_price = coalesce(excluded.unit_price, product_variants.unit_price),
    color_code = coalesce(excluded.color_code, product_variants.color_code),
    updated_at = now();
end; $$ language plpgsql security definer;
create function decrement_variant(
  p_product_id text, p_color text, p_size text, p_style text default ''
) returns void as $$
begin
  update product_variants set quantity = greatest(0, quantity - 1), updated_at = now()
  where product_id = p_product_id and color = p_color and size = p_size and style = coalesce(p_style,'');
end; $$ language plpgsql security definer;

-- 10) Ensure the single-product stock table exists (it only lived in the
-- initial schema.sql, so migration-only databases were missing it — which made
-- the "Stock" number on non-variant products silently fail to save).
create table if not exists inventory (
  product_id text primary key,
  quantity   integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table inventory enable row level security;
drop policy if exists inventory_service_all on inventory;
create policy inventory_service_all on inventory for all to service_role using (true) with check (true);

-- 11) "All Season" and "Winter" prebuilt-box editions (hidden until you fill +
-- show them). Named in the Summer aesthetic. Re-running never overwrites edits.
insert into prebuilt_boxes (slug, name, style, variant, tagline, description, aesthetic, featured, image, custom_price, sort_order, active, selection)
values
  ('toujours',        'Toujours',         'All Season', 'neutral', 'The essentials she''ll reach for in every season, chosen with care.', 'Timeless everyday pieces — soft layers, gentle skincare, and keepsakes that suit any time of year.', 'Cream · Timeless · Everyday', false, null, null, 10, false, '{}'::jsonb),
  ('petit-nuage',     'Petit Nuage',      'All Season', 'boy',     'Soft, easy comfort for him, whatever the season brings.', 'Light, breathable layers and calming botanicals for an easy, all-season welcome.', 'Mist · Gentle · Enduring', false, null, null, 11, false, '{}'::jsonb),
  ('fleur-eternelle', 'Fleur Éternelle',  'All Season', 'girl',    'Tender and timeless, blooming softly through every season.', 'Delicate everyday pieces and gentle keepsakes that stay beautiful all year through.', 'Petal · Timeless · Soft', false, null, null, 12, false, '{}'::jsonb),
  ('nuit-douce',      'Nuit Douce',       'Winter', 'neutral', 'Warmth gathered close on the longest, quietest nights.', 'Cocooning layers, warming rituals, and soft keepsakes for the gentlest winter beginning.', 'Oat · Warm · Cocooning', false, null, null, 20, false, '{}'::jsonb),
  ('ciel-dhiver',     'Ciel d''Hiver',    'Winter', 'boy',     'First snow and slate-blue calm for his gentlest beginning.', 'Cozy knits, soothing botanicals, and keepsakes to treasure through his first winter.', 'Slate · Cozy · Still', false, null, null, 21, false, '{}'::jsonb),
  ('rose-dhiver',     'Rose d''Hiver',    'Winter', 'girl',    'Blush and wool-soft warmth for her first winter''s hush.', 'Tender warm layers, gentle care, and soft keepsakes to welcome her in the cold months.', 'Blush · Warm · Tender', false, null, null, 22, false, '{}'::jsonb)
on conflict (slug) do nothing;

-- 12) Editable homepage copy (perks bar, "What makes it special", reviews).
-- One row per block, value is JSON. Missing rows fall back to in-code defaults.
create table if not exists site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table site_content enable row level security;
drop policy if exists site_content_public_read on site_content;
create policy site_content_public_read on site_content for select using (true);
drop policy if exists site_content_service_write on site_content;
create policy site_content_service_write on site_content for all to service_role using (true) with check (true);

-- 13) Journal posts — admin-authored blog posts (Portal → Journal). Built-in
-- starter posts still render via code; published rows here add to / override them.
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

-- 14) Corporate & Team Gifting leads. Inserts via the service-role server
-- action only; duplicate emails allowed (no unique constraint).
create table if not exists public.b2b_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  company text,
  team_size text,          -- '<50' | '50-200' | '200-1000' | '1000+'
  message text,
  created_at timestamptz not null default now()
);
alter table public.b2b_leads enable row level security;
drop policy if exists b2b_leads_service_write on public.b2b_leads;
create policy b2b_leads_service_write on public.b2b_leads for all to service_role using (true) with check (true);

-- 15) Social posts — uploadable photo/video feed + Instagram/TikTok embeds.
-- Powers the Social Feed admin page and the homepage Instagram grid.
create table if not exists social_posts (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('image', 'video', 'instagram', 'tiktok')),
  media_url     text,                             -- uploaded file public URL
  embed_url     text,                             -- original IG/TikTok post URL
  caption       text not null default '',
  active        boolean not null default true,
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists social_posts_active_idx on social_posts (active, display_order, created_at desc);
alter table social_posts enable row level security;
drop policy if exists social_posts_public_read on social_posts;
create policy social_posts_public_read on social_posts for select using (active = true);
drop policy if exists social_posts_service_write on social_posts;
create policy social_posts_service_write on social_posts for all to service_role using (true) with check (true);

-- 16) Card-style auto-detect metadata — message placement, font, and theme,
-- filled automatically from the uploaded artwork via Claude vision.
alter table card_styles add column if not exists meta jsonb;

-- 17) Outreach tracker (lightweight CRM): contacts + touches + flags + inbound
-- quarantine. Backs Portal → Outreach "Needs Attention" and corporate flagging.
create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text,
  company        text,
  track          text not null default 'A',
  status         text not null default 'new',
  source         text,
  is_corporate   boolean not null default false,
  company_size   text,
  needs          text,
  gifts_per_year text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists contacts_corporate_idx on public.contacts (is_corporate, updated_at desc);

create table if not exists public.touches (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction  text not null,
  channel    text not null default 'email',
  snippet    text,
  created_at timestamptz not null default now()
);
create index if not exists touches_contact_idx on public.touches (contact_id, created_at desc);

create table if not exists public.flags (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  priority    text not null default 'warm',
  reason      text not null,
  status      text not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists flags_open_idx on public.flags (status, priority, created_at desc);

create table if not exists public.inbound_quarantine (
  id               uuid primary key default gen_random_uuid(),
  from_email       text not null,
  from_domain      text,
  subject          text,
  snippet          text,
  likely_corporate boolean not null default false,
  status           text not null default 'pending',
  created_at       timestamptz not null default now()
);
create index if not exists quarantine_pending_idx on public.inbound_quarantine (status, likely_corporate desc, created_at desc);

alter table public.contacts           enable row level security;
alter table public.touches            enable row level security;
alter table public.flags              enable row level security;
alter table public.inbound_quarantine enable row level security;
drop policy if exists contacts_service   on public.contacts;
create policy contacts_service   on public.contacts           for all to service_role using (true) with check (true);
drop policy if exists touches_service    on public.touches;
create policy touches_service    on public.touches            for all to service_role using (true) with check (true);
drop policy if exists flags_service      on public.flags;
create policy flags_service      on public.flags              for all to service_role using (true) with check (true);
drop policy if exists quarantine_service on public.inbound_quarantine;
create policy quarantine_service on public.inbound_quarantine for all to service_role using (true) with check (true);

-- 18) Internationalization: per-currency prices + market waitlist.
create table if not exists public.product_prices (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null,
  currency    text not null check (currency in ('USD','GBP','EUR')),
  unit_amount int  not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, currency)
);
create index if not exists product_prices_lookup_idx on public.product_prices (product_id, currency, active);
alter table public.product_prices enable row level security;
drop policy if exists product_prices_public_read on public.product_prices;
create policy product_prices_public_read on public.product_prices for select using (active = true);
drop policy if exists product_prices_service_write on public.product_prices;
create policy product_prices_service_write on public.product_prices for all to service_role using (true) with check (true);

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  region     text,
  created_at timestamptz not null default now(),
  unique (email, region)
);
alter table public.waitlist enable row level security;
drop policy if exists waitlist_service_write on public.waitlist;
create policy waitlist_service_write on public.waitlist for all to service_role using (true) with check (true);

-- 19) Prebuilt box audience (For Baby / For Mama / Baby & Mama Bundle).
alter table prebuilt_boxes add column if not exists audience text not null default 'bundle';

-- 20) Marketing Cockpit (Phase 1) — extends touches into the outreach ledger
--     and adds the daily plan / task / content tables + the marketing-assets
--     storage bucket. Reuses contacts/touches/flags/inbound_quarantine.
alter table public.touches add column if not exists subject text;
alter table public.touches add column if not exists message_id text;
alter table public.touches add column if not exists in_reply_to text;
alter table public.touches add column if not exists category text;
alter table public.touches add column if not exists intent text;
alter table public.touches add column if not exists sentiment text;
alter table public.touches add column if not exists requires_followup boolean not null default false;
alter table public.touches add column if not exists followup_due date;
alter table public.touches add column if not exists status text;
alter table public.touches add column if not exists track text;
create index if not exists touches_followup_idx on public.touches (followup_due) where followup_due is not null;
create index if not exists touches_message_idx on public.touches (message_id);
create index if not exists touches_status_idx on public.touches (status);

create table if not exists public.daily_plans (
  id            uuid primary key default gen_random_uuid(),
  plan_date     date unique not null,
  recap         text,
  strategy_note text,
  exec_rate     numeric,
  flags         jsonb,
  created_at    timestamptz not null default now()
);
alter table public.daily_plans enable row level security;
drop policy if exists daily_plans_service on public.daily_plans;
create policy daily_plans_service on public.daily_plans for all to service_role using (true) with check (true);

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  plan_date     date not null,
  title         text not null,
  channel       text,
  task_type     text,
  why           text,
  est_minutes   int,
  priority      int not null default 3,
  status        text not null default 'open',
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists tasks_plan_idx on public.tasks (plan_date);
alter table public.tasks enable row level security;
drop policy if exists tasks_service on public.tasks;
create policy tasks_service on public.tasks for all to service_role using (true) with check (true);

create table if not exists public.content_assets (
  id              uuid primary key default gen_random_uuid(),
  storage_path    text not null,
  public_url      text,
  product         text,
  platform        text,
  brand_fit       int,
  craft           int,
  composite       int,
  color_on_brand  boolean,
  verdict         text,
  recommended_use text,
  strengths       jsonb,
  fixes           jsonb,
  created_at      timestamptz not null default now()
);
alter table public.content_assets enable row level security;
drop policy if exists content_assets_service on public.content_assets;
create policy content_assets_service on public.content_assets for all to service_role using (true) with check (true);

create table if not exists public.content_queue (
  id             uuid primary key default gen_random_uuid(),
  plan_date      date not null,
  platform       text not null,
  suggested_time text,
  caption_draft  text,
  image_brief    text,
  asset_id       uuid references public.content_assets(id) on delete set null,
  status         text not null default 'suggested',
  posted_at      timestamptz,
  post_url       text,
  created_at     timestamptz not null default now()
);
create index if not exists content_queue_plan_idx on public.content_queue (plan_date);
alter table public.content_queue enable row level security;
drop policy if exists content_queue_service on public.content_queue;
create policy content_queue_service on public.content_queue for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('marketing-assets', 'marketing-assets', true)
on conflict (id) do nothing;

-- 21) Cold-outreach sender (Gmail DWD) — suppression list (STOP / bounce / manual)
--     and an outreach-eligibility flag on contacts so the sender NEVER cold-emails
--     customers or inbound leads by accident (only contacts explicitly enrolled).
create table if not exists public.suppression (
  email      text primary key,
  reason     text,                 -- stop | bounce | manual | complaint
  created_at timestamptz not null default now()
);
alter table public.suppression enable row level security;
drop policy if exists suppression_service on public.suppression;
create policy suppression_service on public.suppression for all to service_role using (true) with check (true);

-- Only contacts with outreach_enrolled = true are eligible for cold sends.
alter table public.contacts add column if not exists outreach_enrolled boolean not null default false;
-- First name (for the {{first_name}} merge field). Falls back to the first token
-- of `name` at send time when null.
alter table public.contacts add column if not exists first_name text;

-- 22) Customer-chosen message placement on the printed card. {x,y,w,align}
--     percentages, like card_styles.meta.textZone. Null = use the card's default.
alter table public.orders add column if not exists letter_zone jsonb;

-- 23) Estimated $ cost per marketing task (cents). 0 = organic/free.
alter table public.tasks add column if not exists est_cost_cents int;

-- 24) Scheduled outreach campaigns — send a whole enrolled list at a chosen time.
--     A frequent cron fires each campaign when scheduled_at arrives, honoring
--     suppression / MX / merge-field / cap guards. Resumable across ticks.
create table if not exists public.scheduled_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  scheduled_at  timestamptz not null,
  track_filter  text,                          -- null = all enrolled
  template_key  text not null,
  per_run_cap   int,                            -- null = OUTREACH_DAILY_CAP
  status        text not null default 'scheduled', -- scheduled | sending | sent | canceled
  sent_count    int not null default 0,
  skipped_count int not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index if not exists scheduled_campaigns_due_idx on public.scheduled_campaigns (status, scheduled_at);
alter table public.scheduled_campaigns enable row level security;
drop policy if exists scheduled_campaigns_service on public.scheduled_campaigns;
create policy scheduled_campaigns_service on public.scheduled_campaigns for all to service_role using (true) with check (true);

-- 25) Per-recipient cold-email override ({subject, body}). When set, this exact
--     email is used for that contact instead of the track template. Editable
--     templates themselves live in site_content under key 'outreach.templates'.
alter table public.contacts add column if not exists email_override jsonb;


-- 26) Footer newsletter phone capture (optional field beside the email input).
create table if not exists public.newsletter_phones (
  email      text primary key,
  phone      text not null,
  created_at timestamptz not null default now()
);
alter table public.newsletter_phones enable row level security;
drop policy if exists newsletter_phones_service on public.newsletter_phones;
create policy newsletter_phones_service on public.newsletter_phones for all to service_role using (true) with check (true);

-- (The First Year sub-line was removed. To drop its tables, run drop_first_year.sql.)


-- 27) Daily cold-outreach pipeline — prospector (nightly web-search agent) →
--     drafter → morning review queue → approved-only send drain.
--     Structural guarantee: the sender only ever selects sends joined to drafts
--     with status 'approved_by_user'. Seeds (templates A–H, rotation, verifier
--     quotas) mirror docs/outreach-kit.md — edit copy there / in the portal.
--     Idempotent. (Standalone copy: outreach_pipeline.sql)

-- Prospects discovered by the nightly agent. One row per person+company; the
-- unique domain index enforces "one prospect per company" dedup at insert time.
create table if not exists public.prospects (
  id                uuid primary key default gen_random_uuid(),
  company           text not null,
  domain            text,
  person_name       text,
  title             text,
  metro             text,
  category          text,
  linkedin_url      text,                -- stored for MANUAL verification only; never scraped
  email             text,
  email_grade       text,                -- A published | B verified | C risky | D unverifiable
  verifier_score    numeric,
  verifier_provider text,
  fit_reason        text,                -- one verifiable sentence, used for personalization
  status            text not null default 'discovered',
    -- discovered | awaiting_verification | needs_manual_check | drafted | queued
    -- | sent | replied | bounced | suppressed | skipped | discarded
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists prospects_domain_uidx on public.prospects (lower(domain)) where domain is not null;
create unique index if not exists prospects_email_uidx  on public.prospects (lower(email))  where email  is not null;
create index if not exists prospects_status_idx on public.prospects (status);
alter table public.prospects enable row level security;
drop policy if exists prospects_service on public.prospects;
create policy prospects_service on public.prospects for all to service_role using (true) with check (true);

-- Pre-drafted emails awaiting the morning review. Nothing sends from
-- 'pending_review'; approval is an explicit portal click.
create table if not exists public.email_drafts (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references public.prospects(id) on delete cascade,
  template_key   text,
  subject        text not null,
  body           text not null,          -- plain text, footer appended at send time
  is_followup    boolean not null default false,
  draft_kind     text not null default 'cold',   -- cold | followup | reply_assist
  status         text not null default 'pending_review',
    -- pending_review | approved_by_user | rejected | superseded
  edited_by_user boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists email_drafts_status_idx on public.email_drafts (status, created_at);
create index if not exists email_drafts_prospect_idx on public.email_drafts (prospect_id);
alter table public.email_drafts enable row level security;
drop policy if exists email_drafts_service on public.email_drafts;
create policy email_drafts_service on public.email_drafts for all to service_role using (true) with check (true);

-- Send queue + ledger. A row is only created when a draft is approved; the
-- drainer re-verifies approval via an inner join before every send.
create table if not exists public.sends (
  id               uuid primary key default gen_random_uuid(),
  draft_id         uuid not null references public.email_drafts(id) on delete cascade,
  gmail_message_id text,
  sent_at          timestamptz,
  status           text not null default 'queued',   -- queued | sent | failed
  created_at       timestamptz not null default now()
);
create index if not exists sends_status_idx on public.sends (status, created_at);
alter table public.sends enable row level security;
drop policy if exists sends_service on public.sends;
create policy sends_service on public.sends for all to service_role using (true) with check (true);

-- Category templates A–H (+ universal follow-up, + reply-assist bases). Named
-- pipeline_templates because the track-A/C templates of the manual sender
-- already live in site_content under 'outreach.templates'.
create table if not exists public.pipeline_templates (
  key             text primary key,
  category        text not null,
  subject         text not null,
  body            text not null,          -- may contain {{first_name}} {{company}} {{opening}}
  generic_opening text,                   -- used when fit_reason is too thin to personalize
  created_at      timestamptz not null default now()
);
alter table public.pipeline_templates enable row level security;
drop policy if exists pipeline_templates_service on public.pipeline_templates;
create policy pipeline_templates_service on public.pipeline_templates for all to service_role using (true) with check (true);

-- Key/value pipeline config: rotation state, cap, blocklists, verifier quotas,
-- lookbook toggle. jsonb so the portal can edit without migrations.
create table if not exists public.outreach_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.outreach_config enable row level security;
drop policy if exists outreach_config_service on public.outreach_config;
create policy outreach_config_service on public.outreach_config for all to service_role using (true) with check (true);

-- Nightly digest, one row per day — drives the 7-day sparkline on the review page.
create table if not exists public.daily_runs (
  run_date   date primary key,
  stats      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.daily_runs enable row level security;
drop policy if exists daily_runs_service on public.daily_runs;
create policy daily_runs_service on public.daily_runs for all to service_role using (true) with check (true);

-- Suppression gains a domain column (suppress a whole company when asked).
alter table public.suppression add column if not exists domain text;

-- ── Seeds (on conflict do nothing — safe to re-run; edit live rows in portal) ──

insert into public.outreach_config (key, value) values
  ('rotation', jsonb_build_object(
    'cursor', 0,
    'metros', jsonb_build_array('Seattle','San Francisco','New York','Boston','San Diego','Miami'),
    'categories', jsonb_build_array(
      'tech_people_ops','law','vc_platform','wealth_mgmt',
      'luxury_real_estate','agencies_pr','interior_events','beauty_fertility_health'),
    'titles', jsonb_build_object(
      'tech_people_ops', jsonb_build_array('Head of People','People Operations Manager','Employee Experience Manager','HR Director'),
      'law', jsonb_build_array('Managing Partner','Client Relations Director','Marketing Director'),
      'vc_platform', jsonb_build_array('Head of Platform','Platform Manager','Community Manager'),
      'wealth_mgmt', jsonb_build_array('Wealth Advisor','Client Experience Manager','Practice Manager'),
      'luxury_real_estate', jsonb_build_array('Broker','Team Lead','Director of Client Care'),
      'agencies_pr', jsonb_build_array('Office Manager','Operations Director','Chief of Staff'),
      'interior_events', jsonb_build_array('Principal Designer','Studio Manager','Event Producer'),
      'beauty_fertility_health', jsonb_build_array('Founder','Practice Manager','Patient Coordinator')))),
  ('daily_send_cap', '25'::jsonb),
  ('blocklist', jsonb_build_object(
    'domains', jsonb_build_array('amazon.com','walmart.com','verisk.com'),
    'competitors', jsonb_build_array())),
  ('verifier', jsonb_build_object(
    'cascade', jsonb_build_array('hunter','emailawesome','zerobounce','neverbounce','apollo','millionverifier'),
    'providers', jsonb_build_object(
      'hunter',          jsonb_build_object('monthly_quota', 100,  'used', 0, 'cycle_start', null),
      'emailawesome',    jsonb_build_object('monthly_quota', 1000, 'used', 0, 'cycle_start', null),
      'zerobounce',      jsonb_build_object('monthly_quota', 100,  'used', 0, 'cycle_start', null),
      'apollo',          jsonb_build_object('monthly_quota', 100,  'used', 0, 'cycle_start', null),
      'neverbounce',     jsonb_build_object('monthly_quota', 1000, 'used', 0, 'cycle_start', null),
      'millionverifier', jsonb_build_object('monthly_quota', 200,  'used', 0, 'cycle_start', null)))),
  ('lookbook', jsonb_build_object(
    'include_in_first_touch', false,
    'logo_ribbon', 'printed gift tag with your logo, +$2/box',
    'lead_time', '2–3 weeks for orders of 25+',
    'contact_line', 'hello@petitelavande.com · petitelavande.com/corporate'))
on conflict (key) do nothing;

insert into public.pipeline_templates (key, category, subject, body, generic_opening) values
('A', 'tech_people_ops', 'new-parent gifts your team will actually remember',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. People teams use us when someone welcomes a baby: personal instead of a logo mug, your card, flexible quantities, fully handled.

Would it help if I sent over our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
'Congratulations threads are a constant on a People team — someone is always welcoming a baby.'),

('B', 'law', $$for your clients' biggest moments$$,
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Attorneys send them when a client welcomes a baby; they tend to be the gift people keep, and remember who it came from.

Could I send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
'When a client welcomes a baby, a thoughtful gesture is remembered for years.'),

('C', 'vc_platform', 'when a founder welcomes a baby',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Platform teams use us for founder and portfolio baby gifts: personal, traceable materials, zero logistics on your end.

Want me to send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$Portfolio founders don't stop having babies between board meetings.$$),

('D', 'wealth_mgmt', 'marking client milestones, done beautifully',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Advisory teams send them when a client's family grows — a new baby or grandchild — quietly beautiful, with your card.

Could I send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$Advisors mark client milestones, and a new baby or grandchild is the biggest one.$$),

('E', 'luxury_real_estate', 'the gift after the closing gift',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Brokers send them when a client's family grows: a closing gift is expected, but this one is remembered.

Would it help if I sent our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$A closing gift is expected. A gift when your client's family grows is remembered.$$),

('F', 'agencies_pr', 'client & team baby gifts, fully handled',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Agencies use us for client and team baby gifts — personal, on-brand for you (your card, optional logo gift tag), and fully handled.

Could I send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$Client and team babies arrive on their own timeline — usually mid-campaign.$$),

('G', 'interior_events', 'for the clients who invite you into their homes',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Designers and planners send them when a client welcomes a baby — beautiful enough to live on the shelf you designed.

Want me to send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$Your clients invite you into their homes — and into their milestones.$$),

('H', 'beauty_fertility_health', 'postpartum gifts that see the mother',
$tpl$Hi {{first_name}},

{{opening}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. We design for the mother, not just the baby — which is why studios and clinics send our boxes to clients through pregnancy and postpartum.

Could I send our corporate lookbook with pricing? Details at petitelavande.com/corporate.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
$$Your clients are navigating pregnancy and postpartum — exactly the moment we design for.$$),

('followup', 'universal', 'quick follow-up — Petite Lavande',
$tpl$Hi {{first_name}},

Just floating this back up — I know inboxes are busy. If {{company}} ever sends gifts when someone welcomes a baby, I'd love to share our lookbook with corporate pricing. Details at petitelavande.com/corporate.

If the timing's off, no need to reply — I won't follow up again.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
null),

('reply-lookbook', 'reply', 'Re: Petite Lavande — lookbook & corporate pricing',
$tpl$Hi {{first_name}},

Wonderful — here's our lookbook with corporate pricing: {{lookbook_url}}

It covers our boxes, per-box pricing at 10/25/50 quantities, the logo gift-tag option, and lead times. Happy to answer anything, or put together a sample order for {{company}}.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
null),

('reply-lookbook-pending', 'reply', 'Re: Petite Lavande — corporate gifting',
$tpl$Hi {{first_name}},

Wonderful — thank you for the interest. I'll send our lookbook with corporate pricing over this week; in the meantime, there's an overview at petitelavande.com/corporate.

Happy to answer anything before then, or put together a sample order for {{company}}.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$,
null)
on conflict (key) do nothing;


-- 28) Corporate lookbook builder — brand image library (private bucket,
--     AI-tagged), editable catalog tiers, and versioned published PDFs. The
--     stable public route /corporate/lookbook.pdf 302s to a signed URL of the
--     current version, so links in old emails never rot. Idempotent.
--     (Standalone copy: lookbook.sql)

-- Uploaded brand photos (Supabase Storage bucket 'brand-assets', PRIVATE —
-- everything is served through short-lived signed URLs).
create table if not exists public.brand_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  kind         text,                    -- hero | tier | detail | lifestyle | logo
  tier         text,                    -- detected/assigned catalog tier name, if any
  tags         jsonb not null default '[]'::jsonb,
  off_palette  boolean not null default false,   -- soft warning only, never blocking
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
alter table public.brand_images enable row level security;
drop policy if exists brand_images_service on public.brand_images;
create policy brand_images_service on public.brand_images for all to service_role using (true) with check (true);

-- Catalog tiers, editable inline in the builder (prices in whole USD).
create table if not exists public.catalog_tiers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  price              int not null,
  corporate_price_10 int,
  corporate_price_25 int,
  corporate_price_50 int,
  description        text,
  sort               int not null default 0
);
alter table public.catalog_tiers enable row level security;
drop policy if exists catalog_tiers_service on public.catalog_tiers;
create policy catalog_tiers_service on public.catalog_tiers for all to service_role using (true) with check (true);

-- Published lookbook versions. Publishing flips every other row is_current=false;
-- old versions stay downloadable in the portal forever.
create table if not exists public.lookbook_versions (
  id           uuid primary key default gen_random_uuid(),
  version      int not null unique,
  storage_path text not null,
  copy         jsonb not null default '{}'::jsonb,   -- all builder copy fields as published
  image_map    jsonb not null default '{}'::jsonb,   -- slot → brand_images.id
  is_current   boolean not null default false,
  published_at timestamptz not null default now()
);
create index if not exists lookbook_versions_current_idx on public.lookbook_versions (is_current);
alter table public.lookbook_versions enable row level security;
drop policy if exists lookbook_versions_service on public.lookbook_versions;
create policy lookbook_versions_service on public.lookbook_versions for all to service_role using (true) with check (true);

-- PRIVATE bucket (unlike home-images / marketing-assets / product-images):
-- lookbook PDFs + brand photos are only reachable via signed URLs.
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

-- Seed the six tiers (edit inline in Portal → Lookbook → Builder).
insert into public.catalog_tiers (name, price, corporate_price_10, corporate_price_25, corporate_price_50, description, sort) values
  ('Petit Nuage', 85, 81, 77, 72, 'A gentle first hello — soft organic essentials for baby''s first days.', 1),
  ('Douce Maman', 95, 90, 86, 81, 'For her — calming botanicals and small comforts for the fourth trimester.', 2),
  ('Signature Lavande', 125, 119, 113, 106, 'Our signature — Provence lavender, organic cotton, and keepsakes chosen with care.', 3),
  ('Mère et Bébé', 140, 133, 126, 119, 'Comfort for her, softness for baby — one gift that remembers both.', 4),
  ('Maison', 175, 166, 158, 149, 'A fuller welcome — soft layers, gentle care, and keepsakes for the nursery.', 5),
  ('L''Heure Dorée', 200, 190, 180, 170, 'The golden hour — our most complete gift, finished by hand.', 6)
on conflict (name) do nothing;


-- 29) Press mode — a 'press' channel on the outreach pipeline for gift-guide
--     editor outreach. Byline-method prospecting, hard guide-specific
--     personalization rule, /press public kit page, separate daily cap.
--     Outlet tiers + templates mirror docs/press-pitch-kit.md.
--     Idempotent. (Standalone copy: press_mode.sql)

-- Prospects grow press fields. channel: corporate | press.
alter table public.prospects add column if not exists channel text not null default 'corporate';
alter table public.prospects add column if not exists outlet text;
alter table public.prospects add column if not exists tier int;
alter table public.prospects add column if not exists guide_url text;
alter table public.prospects add column if not exists guide_title text;
alter table public.prospects add column if not exists freelancer boolean not null default false;
alter table public.prospects add column if not exists closed_until date;      -- closed_this_cycle → re-pitch eligible after this
alter table public.prospects add column if not exists placement_url text;     -- set manually when a guide publishes
alter table public.prospects add column if not exists placed_at timestamptz;

-- One-prospect-per-company stays a CORPORATE rule; press outlets have many
-- writers per domain. Unique email stays global (re-pitch reuses the row).
drop index if exists prospects_domain_uidx;
create unique index if not exists prospects_domain_corporate_uidx
  on public.prospects (lower(domain)) where domain is not null and channel = 'corporate';
create index if not exists prospects_channel_idx on public.prospects (channel, status);

-- Press-kit flag on brand images (drives the public /press page + zip).
alter table public.brand_images add column if not exists is_press boolean not null default false;

-- ── Press config: outlet tiers, rotation, cap, founder-story flag ────────────
insert into public.outreach_config (key, value) values
  ('press', jsonb_build_object(
    'cursor', 0,
    'outlets_per_night', 3,
    'rotation_order', jsonb_build_array(3, 1, 2, 4),
    'daily_cap', 5,
    'founder_story_enabled', false,
    'brand_one_liner', 'Organic newborn & postpartum gift boxes, finished by hand in Seattle — every material traced to source.',
    'tiers', jsonb_build_object(
      '1', jsonb_build_array(
        jsonb_build_object('name','The Bump','domain','thebump.com'),
        jsonb_build_object('name','Babylist','domain','babylist.com'),
        jsonb_build_object('name','Parents','domain','parents.com'),
        jsonb_build_object('name','Motherly','domain','mother.ly'),
        jsonb_build_object('name','Romper','domain','romper.com'),
        jsonb_build_object('name','Scary Mommy','domain','scarymommy.com'),
        jsonb_build_object('name','What to Expect','domain','whattoexpect.com'),
        jsonb_build_object('name','TODAY Parents','domain','today.com')),
      '2', jsonb_build_array(
        jsonb_build_object('name','Good Housekeeping','domain','goodhousekeeping.com'),
        jsonb_build_object('name','Real Simple','domain','realsimple.com'),
        jsonb_build_object('name','The Strategist','domain','nymag.com'),
        jsonb_build_object('name','Wirecutter','domain','nytimes.com'),
        jsonb_build_object('name','Forbes Vetted','domain','forbes.com'),
        jsonb_build_object('name','Reviewed','domain','usatoday.com'),
        jsonb_build_object('name','BuzzFeed Shopping','domain','buzzfeed.com'),
        jsonb_build_object('name','Oprah Daily','domain','oprahdaily.com'),
        jsonb_build_object('name','Town & Country','domain','townandcountrymag.com')),
      '3', jsonb_build_array(
        jsonb_build_object('name','The Seattle Times','domain','seattletimes.com'),
        jsonb_build_object('name','ParentMap','domain','parentmap.com'),
        jsonb_build_object('name','Seattle Met','domain','seattlemet.com'),
        jsonb_build_object('name','Seattle Magazine','domain','seattlemag.com'),
        jsonb_build_object('name','Seattle''s Child','domain','seattleschild.com'),
        jsonb_build_object('name','Seattle Refined','domain','seattlerefined.com'),
        jsonb_build_object('name','425 Magazine','domain','425magazine.com')),
      '4', jsonb_build_array(
        jsonb_build_object('name','Green Child Magazine','domain','greenchildmagazine.com'),
        jsonb_build_object('name','Pregnancy & Newborn','domain','pnmag.com'),
        jsonb_build_object('name','Baby Chick','domain','baby-chick.com'),
        jsonb_build_object('name','Lucie''s List','domain','lucieslist.com'),
        jsonb_build_object('name','Gift Shop Plus','domain','giftshopmag.com')))))
on conflict (key) do nothing;

-- ── Press templates. {{guide_reference}} is the personalization line (guide
--    title + one genuine detail) — the strict renderer refuses to send without
--    it, which is the structural no-generic-pitch guarantee. One link only:
--    {{press_kit_url}}. Samples ARE the CTA for press (unlike corporate).
insert into public.pipeline_templates (key, category, subject, body, generic_opening) values
('press-A', 'press', 'for your holiday gift guide — organic newborn boxes, handmade in Seattle',
$tpl$Hi {{first_name}},

{{guide_reference}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Boxes run $85–$200, ship nationwide, and photograph beautifully: cream, lavender, satin ribbon, a wax seal.

If you're building this year's holiday guide, the press kit (full-res images + line sheet) is at {{press_kit_url}} — and I'm glad to send a sample.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-B', 'press', 'a gift-guide find — organic baby boxes, handmade in Seattle',
$tpl$Hi {{first_name}},

{{guide_reference}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle ($85–$200, ships nationwide). We design for the mother as much as the baby, which tends to be what gift guides are missing.

For your next new-parent roundup, the press kit (full-res images + line sheet) is at {{press_kit_url}} — happy to send a sample.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-C', 'press', 'Seattle founder story — from Amazon to hand-tied ribbon',
$tpl$Hi {{first_name}},

{{guide_reference}}

I'm Emily — I left a corporate career at Amazon to start Petite Lavande, hand-finishing organic newborn & postpartum gift boxes here in Seattle. Every material is traced to source: Provence lavender, Pacific Northwest farms, small American makers.

For a local-maker feature or gift roundup, the press kit is at {{press_kit_url}} — and I'd love to show you the studio, or send a box to see.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-C2', 'press', 'a Seattle maker for your next gift roundup',
$tpl$Hi {{first_name}},

{{guide_reference}}

Petite Lavande hand-finishes organic newborn & postpartum gift boxes here in Seattle — every material traced to source: Provence lavender, Pacific Northwest farms, small American makers.

For a local-maker feature or gift roundup, the press kit (full-res images + line sheet) is at {{press_kit_url}} — happy to send a box to see.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-D', 'press', 'for the gift guides you''re writing this season',
$tpl$Hi {{first_name}},

{{guide_reference}}

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle ($85–$200, ships nationwide). Since you cover gifting across outlets, the press kit (full-res images + line sheet) may be useful more than once: {{press_kit_url}}.

Happy to send a sample for photography.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-E', 'press', 'organic newborn gift boxes — handmade, traceable, Seattle',
$tpl$Hi {{first_name}},

{{guide_reference}}

I'm Emily, founder of Petite Lavande. We hand-finish organic newborn & postpartum gift boxes in Seattle — traceable materials, organic cotton garments from a GOTS-certified manufacturer, $85–$200.

For your readers' gift roundups, the press kit with images and line sheet is at {{press_kit_url}} — glad to send a sample.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-followup', 'press', 'quick follow-up — Petite Lavande press kit',
$tpl$Hi {{first_name}},

Floating this back up in case it's useful for {{outlet}}'s next gift roundup — the press kit (full-res images + line sheet) is at {{press_kit_url}}, and I'm glad to send a sample.

Either way, thank you for the guides — I won't follow up again this season.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null),

('press-sample-reply', 'press_reply', 'Re: Petite Lavande — sample on the way',
$tpl$Hi {{first_name}},

Wonderful — shipping today, tracking to follow. It will arrive exactly as a reader would receive it: hand-finished, wax seal, dried lavender.

If you need anything alongside it — images, pricing, background — it's all in the press kit: {{press_kit_url}}. Or just ask.

Warmly,
Emily Liu, Founder · Petite Lavande$tpl$, null)
on conflict (key) do nothing;

-- 30) Customer product reviews — the storefront form + /api/reviews existed but
--     the table was never created. Moderated in Portal → Reviews; storefront
--     reads approved rows only. All access via service role.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references products(id) on delete cascade,
  customer_name text not null,
  rating        int  not null check (rating between 1 and 5),
  body          text not null,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_product_approved_idx on public.reviews (product_id, approved, created_at desc);
create index if not exists reviews_pending_idx on public.reviews (approved, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists reviews_service_all on public.reviews;
create policy reviews_service_all on public.reviews for all to service_role using (true) with check (true);

-- 31) Phase B growth modules — add-on flags on products, per-SKU unit
--     economics, customer email flow scheduler, marketing opt-outs, and the
--     weekly scorecard snapshot. (Also in supabase/migrations/phase_b_growth.sql)
alter table products add column if not exists is_addon boolean not null default false;
alter table products add column if not exists addon_rank int not null default 0;

create table if not exists public.sku_economics (
  sku_id           text not null references products(id) on delete cascade,
  channel          text not null default 'site' check (channel in ('site', 'etsy')),
  retail_price     int,
  landed_cost      int  not null default 0,
  packaging_cost   int  not null default 0,
  fulfillment_cost int  not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (sku_id, channel)
);
alter table public.sku_economics enable row level security;
drop policy if exists sku_economics_service_all on public.sku_economics;
create policy sku_economics_service_all on public.sku_economics for all to service_role using (true) with check (true);

create table if not exists public.email_events (
  id           uuid primary key default gen_random_uuid(),
  flow         text not null check (flow in ('welcome', 'postpurchase', 'winback')),
  step         int  not null default 1,
  recipient    text not null,
  order_id     uuid,
  template     text not null,
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  canceled_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists email_events_due_idx on public.email_events (scheduled_at) where sent_at is null and canceled_at is null;
create index if not exists email_events_recipient_idx on public.email_events (recipient, flow);
alter table public.email_events enable row level security;
drop policy if exists email_events_service_all on public.email_events;
create policy email_events_service_all on public.email_events for all to service_role using (true) with check (true);

create table if not exists public.email_optouts (
  email      text primary key,
  source     text,
  created_at timestamptz not null default now()
);
alter table public.email_optouts enable row level security;
drop policy if exists email_optouts_service_all on public.email_optouts;
create policy email_optouts_service_all on public.email_optouts for all to service_role using (true) with check (true);

create table if not exists public.weekly_scorecard (
  week_of       date primary key,
  revenue       int not null default 0,
  orders        int not null default 0,
  aov           int not null default 0,
  sessions      int,
  cvr           numeric,
  email_revenue int not null default 0,
  repeat_rate   numeric,
  weeks_on_hand numeric,
  note          text,
  created_at    timestamptz not null default now()
);
alter table public.weekly_scorecard enable row level security;
drop policy if exists weekly_scorecard_service_all on public.weekly_scorecard;
create policy weekly_scorecard_service_all on public.weekly_scorecard for all to service_role using (true) with check (true);

-- Done.
