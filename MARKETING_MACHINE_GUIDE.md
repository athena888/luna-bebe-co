# Marketing Machine — Owner's Guide

Everything below is live. Most of it runs itself; this guide covers the few
things you actually touch, and what happens without you.

## The parts that run themselves (nothing to do)

**Contact capture.** Every checkout, newsletter signup, occasion save, and
segment tap files a contact in **Portal → Contacts**. Only people who opted in
(newsletter / occasion form / chips) ever get marketing email — buyers who only
checked out get order emails and nothing else.

**Welcome series.** Newsletter signup → instant welcome with WELCOME10 →
story email at day 2 → gentle nudge at day 4. If they told us who they're
shopping for, the day-2 email speaks to them (parent / grandparent / gifter).

**Abandoned carts.** A cart pending an hour gets the recovery email on the next
daily run; still unpaid three days later, one more ("still saved") — never a
discount, never a third. Paid carts silently drop out.

**Occasions.** A saved due date triggers one email 30 days before; a birthday,
21 days before, every year. One reminder per occasion, ever.

**Referrals (give 15 / get 15).** Every paid order gets a personal PL-XXXXXX
code — in the confirmation email and on the printed insert. Friend redeems →
they get $15 off (min $90) → the buyer automatically gets a $15 thank-you code
by email. Nothing for you to track.

**Win-back.** 75 days after someone's last order, one "we're still here" email.

**Reviews.** Ten days after shipping, one review ask linking to the product page.

**Safety rails, everywhere:** one-click unsubscribe on every marketing email,
opt-outs honored at send time, and all marketing **holds automatically while
the store is closed** — it releases itself on the first daily run after you
flip the store open. Order/shipping/refund emails always flow.

## The parts you drive

**Portal → Campaigns** — your megaphone. Name the campaign (one send per name,
ever — reuse requires a new name), write subject/heading/body, optional button,
tick the segments (live opted-in counts shown), **Send Test to Me**, read it in
your inbox, then the real send unlocks. Every send is logged per recipient.

**Portal → Contacts** — your list. Watch it grow; the segment counts tell you
who your audience actually is (useful before a campaign).

**Portal → Orders → "Referral insert"** — print the give-15/get-15 card
(code + QR) for each order and drop it in the box, next to the Cricut card.

**Corporate form leads** — still land in Morning Review as before; they're
also quietly tagged `corporate` in Contacts so campaigns can include or
exclude them.

## Changing what emails say

`MARKETING_COPY.md` (repo root) holds every template's copy. Edit any wording
there and tell Claude **"apply the copy doc"** — the templates ship from that
file's text. Never write "wax seal" — the seal is a sticker; house terms are
"signature seal" / "sealed by hand".

## Switches (Vercel env vars — all currently ON)

| Flag | Turns off |
|---|---|
| `REFERRALS_ACTIVE` | code minting, redemption rewards, insert/email block |
| `OCCASIONS_ACTIVE` | occasion scheduling (saved dates keep, sends stop) |
| `SEGMENTS_ACTIVE` | per-segment copy variants (default copy for everyone) |
| `CART_SEQUENCE_ACTIVE` | the second cart email (first still sends) |

Set any to `false` in Vercel → redeploy → that machine sleeps without
touching the others.

## On reopening day

1. Flip `NEXT_PUBLIC_STORE_OPEN` to reopen checkout.
2. Run the dress rehearsal: one real purchase → watch order/email/label fire →
   refund it. (This also finally proves the production Stripe webhook.)
3. Held marketing (welcome 2/3, win-backs, occasion emails that came due)
   releases itself on the next daily cron — no action needed.
4. Optional: announce with a campaign — that's what Portal → Campaigns is for.
