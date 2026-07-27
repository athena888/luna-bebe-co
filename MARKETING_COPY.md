# Marketing Copy — Review Doc

Edit any copy here and tell Claude "apply the copy doc" — templates ship from
this file's wording. New builds add their draft copy here **inactive** until
you approve it. (Live templates below are already deployed; edits welcome.)

## Live templates (lib/resend.ts)

### Welcome (instant, on newsletter signup) — subject: `Welcome to Petite Lavande ✨`
> We're so glad you're here. Petite Lavande was born out of a love for new life — every box we create is handcrafted with organic materials, curated with intention, and packed with dried lavender and sealed by hand because every detail matters.
> (No discount — removed 2026-07-27. The welcome email is story-only.)
> CTA: Build Your Box → /build

### Welcome 2 (D+2) — subject: `The story behind every box 🌿`
> Every item in a Petite Lavande box is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every item, so the person you're gifting knows exactly what's touching their baby's skin.
> Hand-packed, finished with satin ribbon, sealed by hand.
> CTA: See the Boxes → /boxes

### Welcome 3 (D+4) — subject: `Still deciding? Let us help ✨`
> Tell us who you're gifting and our gift guide will point you to the right box — for a new mama, a newborn, or both. Or build your own from scratch, item by item.
> (No discount line — removed 2026-07-27.)
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

## Collections (rows seeded INACTIVE — activate each after you approve its copy)

_Say "apply collection copy" and I'll write approved copy into the rows and flip them active._

### for-mama — h1: `Gifts for Mama`
> intro: The baby gets everything, and the mother carries everything. This collection is for her — botanical bath comforts for the tender weeks, calming lavender, and small luxuries she would never buy herself.
> meta title: `Gifts for New Moms — Postpartum Comfort Boxes`
> meta description: `Thoughtful gifts for the new mother — botanical bath soaks, calming lavender, and small luxuries, hand-packed and sealed by hand.`

### for-baby — h1: `Gifts for Baby`
> intro: Soft things for a brand-new person — organic cotton to live in, gentle botanical care, and keepsakes worth growing up with. Every item is traced to its source.
> meta title: `Organic Baby Gifts — Swaddles, Clothing & Keepsakes`
> meta description: `Organic cotton swaddles and clothing from GOTS-certified makers, gentle bath care, and heirloom keepsakes for the newest arrival.`

### for-both — h1: `Gifts for Mama & Baby`
> intro: The gift that understands a birth happens to two people. Pieces for the baby, comfort for the mother — chosen to arrive as one beautiful box.
> meta title: `Mama & Baby Gift Boxes — For Both of Them`
> meta description: `Gift boxes that care for the new mother as much as the baby — organic cotton, botanical comforts, and keepsakes, hand-finished.`

### baby-shower — h1: `Baby Shower Gifts`
> intro: The shower gift they'll remember: not another registry checkbox, but a hand-packed box of organic keepsakes with your message inside.
> meta title: `Baby Shower Gifts They'll Keep`
> meta description: `Stand-out baby shower gifts — organic cotton, gentle botanical care, and keepsakes, ribbon-tied with a personalized card.`

### new-arrival — h1: `Gifts for the New Arrival`
> intro: The baby is here. Send something that says you understand what just happened — soft organic pieces, gentle care, and a card carrying your words.
> meta title: `New Baby Gifts — Welcome the New Arrival`
> meta description: `Welcome-to-the-world gifts for newborns — organic cotton, botanical bath care, and keepsakes, hand-packed and shipped with care.`

### corporate-gifting — h1: `Corporate & Team Baby Gifts`
> intro: When someone on the team becomes a parent, the company's gift speaks for the whole team. Curated boxes, your logo tag if you like, delivered without anyone leaving their desk.
> meta title: `Corporate Baby Gifts for Employees & Clients`
> meta description: `Corporate baby gifting made effortless — curated organic gift boxes for employees and clients, with team cards and volume pricing.`

### Restock email (Build 12, INACTIVE until WAITLIST_ACTIVE) — subject: `It's back — {{product}} 🌿`
> **Back in the studio**
> Good news — {{product}} is back. You asked us to let you know, and waitlist members hear first, so the quietest window to order is right now.
> CTA: See It Now → /products/{{id}}

## Post-launch quartet (backends live, all INACTIVE)

### Build 10 — Anniversary prompt (flips on via ANNIVERSARY_ACTIVE=true) — subject: `The season comes around again 💛`
> **A year already**
> Around this time last year, you sent someone a Petite Lavande box. Babies have a way of multiplying the occasions — a first birthday here, a new arrival there — and we're still hand-packing boxes for every one of them.
> If someone around you is celebrating soon, we'd love to help you say it beautifully.
> CTA: See the Boxes → /boxes
> Rules: yearly on the anniversary of their first order, opted-in only, hard cap 3 repeat-occasion emails per rolling year.

### Build 17 — Recipient gift note (flips on via GIFTNOTE_ACTIVE=true) — subject: `{{sender}} sent you something 🌿`
> **A gift is on its way to you**
> **{{sender}}** has sent you a Petite Lavande box — hand-packed organic keepsakes, on their way to your door. They wrote you a note to go with it.
> CTA: Read Your Note → /note/{{token}}
> fine print in email: "We're Petite Lavande, a small studio making organic baby & new-mama gift boxes. This is the only email we'll send you unless you ask to hear from us."
> Rules: ONE email per recipient ever (enforced in code), suppression honored, needs the checkout recipient-email field + note page (mocked, awaiting approval).

### Build 9 — UGC rights checkbox text (stored verbatim per upload)
> "I give Petite Lavande permission to use this photo in marketing, on the website, in ads, and on marketplace listings. I can withdraw consent anytime by emailing us."
