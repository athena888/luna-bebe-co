# Petite Lavande — Outreach Kit

The source of truth for the daily cold-outreach pipeline's targeting rotation and
email templates. The Supabase seeds in `supabase/migrations/outreach_pipeline.sql`
mirror this file (tables `outreach_config` + `pipeline_templates`). After the first
seed, the **database rows are live** — edit copy in the portal or SQL editor; this
file documents intent and defaults.

> **Emily: review the template copy below before the first real send.** It was
> drafted in the existing brand voice but hasn't had your pass yet.

## Rotation

Each night the prospector works ONE metro × category combo, then advances the
cursor. Combo for cursor `n`:

- `category = categories[n % 8]` — changes **every** night
- `metro = metros[floor(n / 8) % 6]` — changes every 8 nights

So no combo repeats for 48 nights, and consecutive nights never share a category.

**Metros:** Seattle · San Francisco · New York · Boston · San Diego · Miami

**Categories → template → buyer titles:**

| Category key | Template | Who to find |
|---|---|---|
| `tech_people_ops` | A | Head of People, People Operations Manager, Employee Experience Manager, HR Director |
| `law` | B | Managing Partner, Client Relations Director, Marketing Director |
| `vc_platform` | C | Head of Platform, Platform Manager, Community Manager |
| `wealth_mgmt` | D | Wealth Advisor, Client Experience Manager, Practice Manager |
| `luxury_real_estate` | E | Broker, Team Lead, Director of Client Care |
| `agencies_pr` | F | Office Manager, Operations Director, Chief of Staff |
| `interior_events` | G | Principal Designer, Studio Manager, Event Producer |
| `beauty_fertility_health` | H | Founder, Practice Manager, Patient Coordinator |

(The original 11 verticals are merged to 8 so each category maps 1:1 to a
template: agencies+PR → F, interior design+events → G, beauty+fertility/women's
health → H.)

**Hard blocklist** (`outreach_config.blocklist`): amazon.com, walmart.com,
verisk.com (past employers) + a `competitors` list (empty — add domains as found).
Freemail domains are always rejected.

## Email discovery & grading

| Grade | Meaning | Queueable? |
|---|---|---|
| A | Published on the company's own site | ✅ (skips verification) |
| B | Pattern-inferred **and** verifier says deliverable | ✅ |
| C | Verifier says "risky" | ❌ → needs-manual-check list |
| D | Unverifiable | ❌ → discarded |

Verifier cascade (first provider with quota + API key wins): Hunter → ZeroBounce
→ Apollo → NeverBounce → MillionVerifier. Quotas/usage live in
`outreach_config.verifier`. All exhausted → prospect parks as
`awaiting_verification` and retries next cycle. Overflow option when the month
runs dry: MillionVerifier 10K pay-as-you-go (~$37).

LinkedIn URLs are stored for **manual** review only — pages are never scraped.

## Drafting rules (enforced by the drafter + code checks)

- Under 120 words, plain text, exactly one link: `petitelavande.com/corporate`
- CTA is always the **lookbook**, never a sample
- Personalize exactly two things: the `{{opening}}` sentence (from the fit
  reason — specific and verifiable, or the template's generic opening if thin)
  and the `{{first_name}}`/`{{company}}` slots
- Never invent claims about the company or about Petite Lavande traction
- CAN-SPAM footer is appended by the sender (`withFooter`), never in the draft
- Follow-up: one only, 6 days after a send with no reply, universal template

## Templates

All templates share the shape: greeting → `{{opening}}` → who we are + one
category-specific line → lookbook CTA with the single link → sign-off. The seeded
copy lives in `pipeline_templates` (keys A–H, `followup`, `reply-lookbook`,
`reply-lookbook-pending`); see `outreach_pipeline.sql` for full text.

Brand voice guardrails (same as the site assistant): warm not saccharine, quiet,
specific; never "luxury/premium/curated" flatly; cotton garments are "organic
cotton, made by a GOTS-certified manufacturer" — nothing brand- or box-level
GOTS; "relaxation," never "therapy."
