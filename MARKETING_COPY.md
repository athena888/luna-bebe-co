# Marketing Copy — Review Doc

Edit any copy here and tell Claude "apply the copy doc" — templates ship from
this file's wording. New builds add their draft copy here **inactive** until
you approve it. (Live templates below are already deployed; edits welcome.)

## Live templates (lib/resend.ts)

### Welcome (instant, on newsletter signup) — subject: `Welcome to Petite Lavande ✨`
> We're so glad you're here. Petite Lavande was born out of a love for new life — every box we create is handcrafted with organic materials, curated with intention, and packed with dried lavender and sealed by hand because every detail matters.
> Use code **WELCOME10** for 10% off your first order.
> CTA: Build Your Box → /build

### Welcome 2 (D+2) — subject: `The story behind every box 🌿`
> Every item in a Petite Lavande box is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every item, so the person you're gifting knows exactly what's touching their baby's skin.
> Hand-packed, finished with satin ribbon, sealed by hand.
> CTA: See the Boxes → /boxes

### Welcome 3 (D+4) — subject: `Still deciding? Your 10% is waiting ✨`
> Tell us who you're gifting and our gift guide will point you to the right box — for a new mama, a newborn, or both. Or build your own from scratch, item by item.
> Your **WELCOME10** code still takes 10% off your first order.
> CTA: Find the Right Box → /guide

### Abandoned cart (pending >1h, daily cron) — subject: `Your Petite Lavande box is waiting ✨`
> You started building a beautiful gift box but didn't quite finish. Your selections are saved — all you need to do is complete checkout.
> CTA: Complete My Box → /build

### Review ask (ship +10d) — subject: `How was your Petite Lavande box? 🌿`
> Hi {name}, we hope your Petite Lavande box arrived beautifully and brought a little joy. Your review helps other families discover these products — it would mean the world to us.
> CTA: Leave a Review → first product's page

### Win-back (75d since last order) — subject: `A little lavender, from us to you 💛`
> Chances are someone around you is expecting — a friend, a colleague, a sister. When the moment comes, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.
> CTA: See What's New → /boxes

### Order confirmation (transactional) — subject: `Your Petite Lavande order is confirmed`
Green panel, item list w/ thumbnails, total, order ref, track button.

### Shipped (transactional) — subject: `Your Petite Lavande box has shipped 📦`
Green panel, tracking card + button.

## Pending builds (copy drafted per build, inactive until approved)

### Build 6 — Referral loop (LIVE — REFERRALS_ACTIVE=true since 2026-07-25)

**Mechanics:** every paid order mints one personal code `PL-XXXXXX`. Friend gets
**$15 off** (min order $90, one use). When redeemed, the original buyer gets a
**$15 thank-you code** by email (same min, one use, self-referral gets nothing).

**Printed insert card (goes in the box, next to the QR):**
> **Share a little lavender.**
> Give a friend $15 off their first Petite Lavande box — and when they use it, we'll send you $15 off your next one.
> Scan the code, or use **{{CODE}}** at checkout. petitelavande.com

**Reward email (to the referrer when their code is used)** — subject: `A friend used your code — here's $15, from us 💛`
> **Your gift inspired another**
> Someone you shared Petite Lavande with just sent a box of their own. As a thank-you, here's $15 off your next order: **{{CODE}}**
> CTA: Build Your Next Box → /build

**Redeem page /r/{{CODE}} (approved & built):**
> eyebrow: A GIFT FROM A FRIEND
> **$15 toward a Petite Lavande box**
> Someone who loves our boxes wants you to have one too. Your $15 is ready — it applies automatically at checkout on orders of $90 or more.
> CTA: Start Building — $15 applied → /build
> fine print: One use per code. Minimum order $90. Can't be combined with other codes.

**Order-confirmation add-on block (shown only while referrals active):**
> **Give $15, get $15** — your personal code **{{CODE}}** gives a friend $15 off their first box; when they use it, you get $15 off your next one.

### Build 3 — Occasion dates (LIVE — OCCASIONS_ACTIVE=true since 2026-07-25)

**Mechanics:** a customer saves a due date or a baby's birthday. One email goes
out **30 days before a due date**; one **21 days before each birthday** (repeats
yearly). Only opted-in contacts, unsubscribes honored, held while store closed.
Saving a date through the form counts as opt-in (the form says we'll remind them).

**Due-date email** — subject: `The big day is getting close 🌿`
> **Almost time**
> The arrival you asked us to remember is only a few weeks away now. If a gift is part of the plan, this is the window — every box is packed by hand and ships with time to spare.
> Organic keepsakes, chosen piece by piece, ribbon-tied and sealed by hand.
> CTA: Build Their Box → /build

**Birthday email** — subject: `A little birthday is coming up 💛`
> **A day worth celebrating**
> A birthday you asked us to remember is a few weeks out. A box of organic keepsakes — soft things to grow into, gentle things for the bath — is a lovely way to mark the day.
> Hand-packed, finished with satin ribbon and sealed by hand, with your message inside.
> CTA: See the Boxes → /boxes

**Capture card (approved & live — after newsletter signup in the footer):**
> **Is there a big day coming?**
> Tell us the due date or birthday and we'll send one perfectly-timed reminder — nothing else.
> fields: date + "due date / birthday" toggle + optional name · button: Remember It

### Build 7 — Segmentation (INACTIVE — flips on via SEGMENTS_ACTIVE=true after your approval)

**Mechanics:** contacts carry a segment (parent-to-be / grandparent / friend-or-coworker /
corporate). Corporate is auto-set by the corporate inquiry form; everyone else can tell us
via one optional tap after newsletter signup (mockup awaiting approval). When active,
welcome-2 and win-back swap their opening paragraph to match the reader; unknown segments
always get today's copy unchanged.

**Welcome-2 opener variants:**
> _parent-to-be:_ Every item that will touch your baby's skin is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every piece.
> _grandparent:_ A grandbaby changes everything. Every item in the box you send is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender — and the printed card inside tells the story of every piece.
> _friend/coworker:_ The best gift for a new parent is the one they'd never think to buy themselves. Every item is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender — and the printed card inside tells its story.

**Win-back opener variants:**
> _parent-to-be:_ The newborn days go quickly. Whether the next moment is a sibling on the way, a friend's arrival, or a first birthday, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.
> _grandparent:_ Grandbabies have a way of multiplying — a cousin on the way, a first birthday coming up. When the next moment arrives, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.
> _friend/coworker & unknown:_ (unchanged current copy)

**Segment chips (mockup awaiting approval — after newsletter signup, next to the occasion card):**
> **Who are you shopping for?** (optional, one tap)
> chips: My own baby · A grandbaby · A friend or coworker

### Build 1 upgrade — Cart sequence (INACTIVE — flips on via CART_SEQUENCE_ACTIVE=true after your approval)

**Mechanics:** touch 1 is the existing abandoned-cart email (pending >1h, daily
cron — unchanged). Touch 2 goes out **3 days later** only if the cart is still
pending — paid or canceled carts cancel it automatically. No discount code on
purpose: a rescue code teaches people to abandon carts. Also fixed: the cron now
holds while the store is closed, and carts older than 14 days are never emailed.

**Cart touch 2 (D+3)** — subject: `Your box is still saved 🌿`
> **Right where you left it**
> The box you built is still saved, exactly as you left it. If the moment passed, no worries at all — but if that gift is still on your mind, everything is ready to finish in a minute or two.
> Hand-packed within 24 hours of your order, finished with satin ribbon, sealed by hand.
> CTA: Pick Up Where You Left Off → /checkout

### Build 8 — drafts land here with the build.
