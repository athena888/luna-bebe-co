# PRESS & GIFT GUIDE OUTREACH — Phase 1 Plan (awaiting approval)

A LOW-VOLUME, fully-manual press pitching system. Separate data + logic from the
corporate B2B pipeline; shared infra reused read-only. **Nothing auto-sends,
ever** — the system writes personalized drafts into Gmail's Drafts folder and
Emily sends each one by hand.

---

## 1. Infrastructure audit (what exists, what we reuse)

| Piece | Found | Reuse plan |
|---|---|---|
| Gmail API | `lib/gmail.ts` — service-account DWD impersonating `hello@petitelavande.com`, **scope `gmail.send` only** | Add a `draftEmail()` helper using scope `gmail.compose` (covers `drafts.create`). Press code path imports ONLY `draftEmail` — `sendEmail` is never referenced. ⚠️ **Manual step for you** (Phase 2): Google Admin → Security → API Controls → Domain-wide Delegation → edit the existing client → add `https://www.googleapis.com/auth/gmail.compose` to its scope list. Until then draft creation 403s. |
| Suppression list | `suppression` table + `isSuppressed()` / `getSuppressedSet()` in `lib/outreach.ts` | Checked at draft-generation time — a suppressed email is skipped with a visible "suppressed" badge. Read-only. |
| Email log | There is **no `email_log` table** — the closest are `email_events` (customer flows) and `touches` (outreach ledger) | Press activity is logged in `press_contacts` itself (status + dates + notes). *Optional (question 3):* also write a `touches` row per sent pitch so the unified ledger sees press. |
| Anthropic | `lib/anthropic.ts` client; existing pattern uses `claude-sonnet-4-6` | Same client, same model, JSON-out prompt below. |
| Portal auth/layout | `middleware.ts` guards `/portal/*` + `/api/portal/*`; shared sidebar layout | New page `/portal/press` + API `/api/portal/press/*` inherit auth automatically. |
| Existing press mode (§29) | The AUTOMATED pipeline has a `channel='press'` lane (press-prospector, templates, sub-cap) writing to `prospects` | **Untouched.** This new system is parallel and manual. See question 2 about pausing the automated lane to avoid double-pitching. |
| ⚠️ `press_contacts` name | Ambiguous probe: HEAD request says the table exists, SELECT says "not in schema cache", zero references in code | Before the migration runs, verify in SQL editor: `select column_name from information_schema.columns where table_name='press_contacts';` If rows come back, we pick a new name (`press_pitches`). Migration below assumes the name is free. |

## 2. Schema (migration §52 — pasted into SQL editor like the others)

```sql
create table if not exists public.press_contacts (
  id                   uuid primary key default gen_random_uuid(),
  outlet               text not null,
  contact_name         text,              -- blank until Emily fills it
  email                text,              -- NEVER invented; blank until filled
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
  gmail_draft_id       text,              -- so "re-generate" can point at the old draft
  draft_subject_a      text, draft_subject_b text, draft_body text,  -- last generated copy (audit trail)
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.press_contacts enable row level security;
create policy press_contacts_service on public.press_contacts
  for all to service_role using (true) with check (true);
```

Seeds (contact_name/email deliberately NULL):
- **national-parenting**: Babylist, Motherly, The Bump, What to Expect, Romper
- **shopping-editorial**: NY Mag — The Strategist, Forbes Vetted, Good Housekeeping, BuzzFeed Shopping, Wirecutter
- **spanish-market** (language=es): TodoBebé, Ser Padres, BabyCenter en Español

## 3. Portal page — `/portal/press` (mock)

```
┌─ Press & Gift Guides ──────────────────────────────────────────────┐
│ This week: 3 / 10 pitches drafted   [==========          ]         │
│ Pipeline:  new 8 · drafted 2 · sent 3 · bumped 1 · replied 1 ·     │
│            sample_requested 1 · declined 2 · published 1           │
├─ ⏰ Follow-ups due ────────────────────────────────────────────────┤
│ • Bump Sarah C. at Motherly (sent 6 days ago)      [Mark bumped]   │
├─ Contacts ──────────────────────────── [+ Add contact] ────────────┤
│ ☑ Babylist · (no contact yet) ✎          tier: national-parenting  │
│    recent article: [________________] url: [________]              │
│    why relevant:   [____________________________]  lang: en        │
│ ☑ The Strategist · Jane Doe <jane@…>      READY ✓                  │
│    recent article: "The 28 Best Baby Shower Gifts" …               │
│ ☐ Ser Padres · … (suppressed ⛔ — on suppression list)             │
├────────────────────────────────────────────────────────────────────┤
│ 2 selected & complete   [Generate drafts → Gmail]                  │
│  (button disabled unless: status=new, email + article title + url  │
│   + why-note present, not suppressed, weekly cap not exceeded)     │
└────────────────────────────────────────────────────────────────────┘
```

Row actions per status: `drafted → [Mark sent]`, `sent → [Mark replied] [Mark sample requested]`,
plus inline notes and per-outlet history (every prior contact at the same outlet listed on expand).

**Status automation (lazy, on page load — no cron):**
- `sent` + 6 days → appears in "Follow-ups due" as *bump {name} at {outlet}* (reminder only, never an email)
- `bumped` + 10 days without reply → auto-set `declined` (declined_at stamped, note "auto: no reply 10d after bump")
- One bump max per contact — after `bumped` the only moves are replied/sample_requested/declined/published.

**Weekly cap:** `drafted_at` in the trailing 7 days counts toward 10; the Generate button
refuses to start a batch that would exceed it (and shows why).

## 4. Draft generation — exact prompt

One Anthropic call per contact (`claude-sonnet-4-6`, existing client). Result is
parsed as JSON and written to Gmail Drafts via `draftEmail()`; `status=drafted`,
copy stored on the row. **`send` is never called.**

**System prompt:**

```
You write PRESS PITCHES for Petite Lavande, a French-countryside-inspired
newborn & postpartum gift box brand. You write to a specific journalist about
their specific work — never a mail-merge blast.

BRAND FACTS (the only claims you may make):
- French-countryside-inspired newborn & postpartum gift boxes
- Organic cotton garments; hand-knit blankets
- Own-designed crochet dolls — designed in-house, not sourced stock
- Every box includes gifts for the mother, not just the baby
- Hand-packed in woven seagrass baskets
- Price range $65–165
- Site: https://petitelavande.com

HARD RULES:
- OPEN with a specific, natural reference to the journalist's recent article
  (title/context provided below). Never invent facts about them or their work
  beyond what is provided.
- ~140 words for the email body. Warm, specific, zero hype words
  ("revolutionary", "game-changing"), no urgency.
- The offer: a sample box for consideration, hi-res images, and the lookbook
  (https://petitelavande.com/corporate/lookbook.pdf) — "no obligation either way."
- Mention the press kit only if natural: https://petitelavande.com/press
- Sign off exactly:
  Emily Liu, Founder — petitelavande.com
- If LANGUAGE is "es": write natural, warm US-Spanish (not a literal
  translation). No gendered greetings; "baby shower" stays in English;
  "canastilla" for gift box.
- Never use "GOTS certified" about the brand or boxes. Cotton claims only as
  "organic cotton".

Respond with ONLY JSON:
{"subject_a": "...", "subject_b": "...", "body": "..."}
Two genuinely different subject lines (one article-angle, one brand-angle),
each ≤ 55 characters, no emoji.
```

**Per-contact user message:**

```
JOURNALIST: {contact_name} — {role} at {outlet} ({outlet_tier})
LANGUAGE: {language}
THEIR RECENT ARTICLE: "{recent_article_title}" — {recent_article_url}
WHY THEY'RE RELEVANT (from Emily): {why_relevant_note}

Write the pitch.
```

The Gmail draft body ends with both subject options? **No** — the draft is
created with `subject_a`; the portal shows both variants and Emily picks before
generating (radio in the row) or swaps the subject in Gmail. (Question 4.)

## 5. Press page audit (`/press` — exists, from §29 press mode)

| Requirement | Status |
|---|---|
| 2-sentence boilerplate | ⚠️ Partial — a configurable ONE-liner exists (`press.brand_one_liner`). Phase 2: add a second sentence / dedicated boilerplate block (portal-editable). |
| Founder photo slot | ❌ Missing. Phase 2: add a `press.founder` image slot (existing site-images slot system) + "About the founder" line. |
| 6–10 hi-res downloadable images | ✅ Mechanism exists (is_press-tagged images, per-image download + zip-all). ⚠️ Count depends on what's uploaded — check Portal → Lookbook → Image Library and tag ≥6 as press. |
| Price range | ⚠️ Partial — full line sheet with per-box prices renders. Phase 2: add explicit "Gift boxes from $65–165" line to the hero. |
| Contact email | ✅ hello@petitelavande.com with mailto in the hero. |

## 6. Questions before Phase 2

1. **`press_contacts` name**: run the SQL check in §1 (last row). If the table
   truly exists as an orphan, I'll use `press_pitches` instead — say which.
2. **The automated §29 press lane** (prospector-driven, templates A–E) stays on?
   Running both risks the same outlet being cold-pitched by the robot while you
   hand-pitch them. My recommendation: pause `channel='press'` prospecting while
   this manual system is active (one config flag, reversible).
3. **Touches ledger**: should each hand-sent pitch also write one row to the
   shared `touches` ledger (so Morning Review's history shows press contacts)?
   Default: no (fully separate), flip if you want one unified history.
4. **Subject pick**: radio button in the portal before generating the Gmail
   draft (draft carries your chosen subject), or always subject_a with both
   stored on the row for reference? Default: radio in portal.
5. **Sample tracking**: `sample_sent` is a manual checkbox on the row — good
   enough, or do you want a date + tracking-number field with it?

## 7. Phase 2 build list (after your "approved")

1. Migration §52 (`press_contacts` + seeds) → you run it in SQL editor.
2. `lib/gmail.ts`: add `draftEmail()` (scope `gmail.compose`; never send).
3. `lib/press-pitch.ts`: prompt + generation + suppression check + cap check.
4. `/api/portal/press` (list/update/generate) + `/portal/press` page (mock above).
5. Press page additions: boilerplate 2-liner, founder photo slot, price-range line.
6. Build, changelog, env vars (none new — reuses GOOGLE_SA_KEY/GMAIL_SENDER/ANTHROPIC_API_KEY), manual steps (DWD scope + SQL run + tag ≥6 press images + fill contact emails).
```
