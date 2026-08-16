-- 52) Manual press & gift-guide outreach (separate from the automated B2B
--     pipeline). Contacts + status timeline for hand-personalized pitches that
--     are generated into Gmail DRAFTS (never auto-sent). Also flips the §29
--     automated press lane to manual mode so the robot never cold-pitches an
--     outlet Emily is hand-pitching. Idempotent.
--     PRE-CHECK (collision rule): this should return 0 rows before first run:
--       select column_name from information_schema.columns
--       where table_name = 'press_contacts' and table_schema = 'public';

create table if not exists public.press_contacts (
  id                   uuid primary key default gen_random_uuid(),
  outlet               text not null,
  contact_name         text,
  email                text,              -- never invented; Emily fills these
  role                 text,
  outlet_tier          text not null check (outlet_tier in
                         ('national-parenting','shopping-editorial','spanish-market','regional')),
  recent_article_title text,
  recent_article_url   text,
  why_relevant_note    text,
  language             text not null default 'en' check (language in ('en','es')),
  status               text not null default 'new' check (status in
                         ('new','drafted','sent','bumped','replied','sample_requested','declined','published')),
  sample_sent          boolean not null default false,
  drafted_at           timestamptz,
  sent_at              timestamptz,
  bumped_at            timestamptz,
  replied_at           timestamptz,
  declined_at          timestamptz,
  published_at         timestamptz,
  published_url        text,
  gmail_draft_id       text,
  draft_subject_a      text,
  draft_subject_b      text,
  draft_body           text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.press_contacts enable row level security;
drop policy if exists press_contacts_service on public.press_contacts;
create policy press_contacts_service on public.press_contacts
  for all to service_role using (true) with check (true);

-- Seed target outlets (contact_name/email intentionally NULL — Emily fills).
insert into public.press_contacts (outlet, outlet_tier, language)
select * from (values
  ('Babylist',                 'national-parenting', 'en'),
  ('Motherly',                 'national-parenting', 'en'),
  ('The Bump',                 'national-parenting', 'en'),
  ('What to Expect',           'national-parenting', 'en'),
  ('Romper',                   'national-parenting', 'en'),
  ('NY Mag — The Strategist',  'shopping-editorial', 'en'),
  ('Forbes Vetted',            'shopping-editorial', 'en'),
  ('Good Housekeeping',        'shopping-editorial', 'en'),
  ('BuzzFeed Shopping',        'shopping-editorial', 'en'),
  ('Wirecutter',               'shopping-editorial', 'en'),
  ('TodoBebé',                 'spanish-market',     'es'),
  ('Ser Padres',               'spanish-market',     'es'),
  ('BabyCenter en Español',    'spanish-market',     'es')
) as seed(outlet, outlet_tier, language)
where not exists (
  select 1 from public.press_contacts p where p.outlet = seed.outlet
);

-- Pause the §29 AUTOMATED press lane (prospector + drafter skip channel=press
-- while manual_mode is true; reversible by setting it false).
insert into public.outreach_config (key, value)
  values ('press', '{"manual_mode": true}'::jsonb)
  on conflict (key) do update set value = public.outreach_config.value || '{"manual_mode": true}'::jsonb;

-- Done.
