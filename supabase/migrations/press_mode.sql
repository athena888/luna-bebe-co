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
