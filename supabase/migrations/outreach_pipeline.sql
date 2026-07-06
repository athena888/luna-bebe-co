-- 27) Daily cold-outreach pipeline — prospector (nightly web-search agent) →
--     drafter → morning review queue → approved-only send drain.
--     Structural guarantee: the sender only ever selects sends joined to drafts
--     with status 'approved_by_user'. Seeds (templates A–H, rotation, verifier
--     quotas) mirror docs/outreach-kit.md — edit copy there / in the portal.
--     Idempotent. Also appended to _RUN_ALL_PENDING.sql as section 27.

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
    'cascade', jsonb_build_array('hunter','zerobounce','apollo','neverbounce','millionverifier'),
    'providers', jsonb_build_object(
      'hunter',          jsonb_build_object('monthly_quota', 50,   'used', 0, 'cycle_start', null),
      'zerobounce',      jsonb_build_object('monthly_quota', 100,  'used', 0, 'cycle_start', null),
      'apollo',          jsonb_build_object('monthly_quota', 100,  'used', 0, 'cycle_start', null),
      'neverbounce',     jsonb_build_object('monthly_quota', 1000, 'used', 0, 'cycle_start', null),
      'millionverifier', jsonb_build_object('monthly_quota', 200,  'used', 0, 'cycle_start', null)))),
  ('lookbook', jsonb_build_object('include_in_first_touch', false))
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

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. Agencies use us for client and team baby gifts — personal, on-brand for you (your card, optional logo ribbon), and fully handled.

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

It covers our boxes, per-box pricing at 10/25/50 quantities, the logo-ribbon option, and lead times. Happy to answer anything, or put together a sample order for {{company}}.

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
