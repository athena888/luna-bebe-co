# Petite Lavande — Press Pitch Kit

Source of truth for the pipeline's `press` channel (gift-guide editor outreach).
The Supabase seeds in `supabase/migrations/press_mode.sql` mirror this file
(`outreach_config.press` + `pipeline_templates` keys `press-*`). After the first
seed, the **database rows are live** — edit outlets/copy there.

> **Emily: review before the first pitch.** The outlet tiers are my starting
> lists, and template C carries your founder story (the Amazon line) — it only
> sends when you flip `founder_story_enabled` to true, but read it first.

## Outlet tiers (rotation order: 3 → 1 → 2 → 4)

Tier 3 first on purpose: Seattle local is the warmest ground and the fastest
feedback loop. ~3 outlets are worked per night (`outlets_per_night`).

| Tier | Focus | Seeded outlets |
|---|---|---|
| 3 | Seattle local | The Seattle Times, ParentMap, Seattle Met, Seattle Magazine, Seattle's Child, Seattle Refined, 425 Magazine |
| 1 | National parenting | The Bump, Babylist, Parents, Motherly, Romper, Scary Mommy, What to Expect, TODAY Parents |
| 2 | National lifestyle/commerce | Good Housekeeping, Real Simple, The Strategist, Wirecutter, Forbes Vetted, Reviewed, BuzzFeed Shopping, Oprah Daily, Town & Country |
| 4 | Niche / trade | Green Child Magazine, Pregnancy & Newborn, Baby Chick, Lucie's List, Gift Shop Plus |

## The byline method

For each outlet in the night's slice, the prospector web-searches
"[outlet] best gifts for new moms", "[outlet] holiday gift guide",
"[outlet] baby shower gifts" and extracts the **byline author of the most
recent guide**, plus the guide's URL and title. Contact discovery:

- **Grade A** — an email published on the writer's own site or X bio.
- **Grade B** — outlet email pattern applied to their name, **verified** by the
  existing cascade. Only A/B may ever queue; risky → manual-check, unverifiable → discarded.
- **Freelancer flag** — a bio showing multiple outlets. Freelancers get drafting
  priority: they place products across publications.

## Hard rules

- **No guide, no pitch.** A prospect with no captured guide URL + title parks as
  `needs_human_personalization` for Emily to finish or discard. The
  `{{guide_reference}}` line must name the editor's actual guide plus one
  genuine detail — the merge renderer refuses to send without it.
- **No press kit, no pitch.** Until at least one image is tagged *press kit*,
  drafting parks prospects as `awaiting_press_kit` — no email may point at an
  empty /press page.
- **One follow-up only**, auto-drafted at 7–10 days. After it sends, the editor
  becomes `closed_this_cycle` — not suppressed; eligible again after **90 days**
  with a new pitch for a new guide.
- Press cap: `daily_cap` (default 5, env `PRESS_DAILY_CAP`) — separate from the
  corporate cap, but press + corporate together never exceed the Gmail ceiling.
- **Manual-only channels — never automate:** Source of Sources, Qwoted,
  Featured, HARO, X/#JournoRequest. No scraping, drafting, or response tooling
  for these, by design.

## Template selection

| Situation | Template |
|---|---|
| Tier 1/2, July–September | A (holiday guide) |
| Tier 1/2, rest of year | B (evergreen) |
| Tier 3, `founder_story_enabled=true` | C (founder story — ex-Amazon, studio invite) |
| Tier 3, flag off (default) | C2 (C minus the founder-personal lines) |
| Tier 4 | E (niche/trade, materials-forward) |
| Freelancer flag (any tier) | D (multi-outlet angle) |

All templates: `{{first_name}}`, `{{guide_reference}}`, `{{press_kit_url}}`
(the one link), under 120 words, sample offered as the CTA (press gets samples;
corporate gets the lookbook). Follow-up uses `{{outlet}}`. Sample-request
replies are pre-drafted from `press-sample-reply` ("shipping today, tracking to
follow") — approval-gated like everything else.

Full template text lives in `press_mode.sql` / the `pipeline_templates` table.

## Placements

When a guide publishes with Petite Lavande in it, mark the placement on the
prospect (stores the URL + date, counts in the daily digest). Placement URLs are
the social-proof lines for future pitches — never invented, only recorded.
