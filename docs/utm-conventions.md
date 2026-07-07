# UTM Conventions — Petite Lavande

How links are tagged so every order can be attributed to its channel. The
capture chain already exists end-to-end: `UTMCapture` stores the first-touch
params in the visitor's session → checkout sends them → they persist on the
`orders.utm_*` columns → Portal → Analytics groups revenue by source (and the
UTM Link Builder there generates tagged links for ads/posts).

## The three parameters

| Param | Allowed values | Meaning |
|---|---|---|
| `utm_source` | `facebook`, `tiktok`, `pinterest`, `google`, `email`, `linkedin`, `outreach`, `press`, `lookbook`, `merchant` | WHERE the click came from |
| `utm_medium` | `cpc`, `paid_social`, `organic`, `newsletter`, `email`, `social`, `referral` | HOW (paid/organic/email…) |
| `utm_campaign` | freeform kebab-case, e.g. `spring-launch`, `newborn-box`, `may-promo` | WHICH push |

Optional: `utm_content` to tell ad variants apart (`video-ad-1`).

Rules:
- Lowercase everything; kebab-case campaigns; never spaces.
- One consistent source per channel — don't mix `fb`/`facebook`.
- First-touch wins: the FIRST tagged link a visitor ever clicks is what the
  order credits. Don't re-tag internal links (never add utm params to links
  between pages on petitelavande.com — that would overwrite real attribution).

## What's tagged automatically (the pipeline)

- **Press kit link in press pitches** (`getCurrentPressKit()`):
  `/press?utm_source=press&utm_medium=email` — fully tracked (it's a page).
- **Lookbook link in reply emails** (`getCurrentLookbook()`):
  `/corporate/lookbook.pdf?utm_source=outreach&utm_medium=email&utm_campaign=lookbook`.
  Honest caveat: a PDF can't run analytics, so these tags are for server logs
  and consistency; measurable on-site attribution for outreach comes from the
  `/corporate` and `/press` page visits and, ultimately, reply→order flow.
- **Cold-email body link** stays the clean human-readable
  `petitelavande.com/corporate` on purpose — plain-text cold email reads worse
  with a long tagged URL, and deliverability beats attribution at first touch.

## Manual links (ads, posts, newsletters)

Use Portal → Analytics → **UTM Link Builder** — its quick templates already
follow these conventions (facebook/cpc, tiktok/paid_social, email/newsletter,
pinterest/organic, google/cpc) and the custom row builds anything else.

## Historical note

An earlier plan referenced a lookbook `?ref=` parameter — it never existed in
the codebase; UTMs (above) are the single convention.
