import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import { REFERRALS_ACTIVE, ensureReferralForOrder } from '@/lib/referrals'
import { PrintButton } from '../packing-slip/PrintButton'

// Printable referral insert (Build 6) — A7 landscape card that goes in the
// box: "Share a little lavender" + the order's personal code + its QR.
// Mints the code on first print if the webhook hasn't yet (flag-gated).
// Reached from Portal → Orders → "Referral insert".

export const dynamic = 'force-dynamic'

export default async function ReferralInsertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin.from('orders').select('*').eq('id', id).maybeSingle()
  if (!data) {
    return <div className="p-12 font-sans text-sm text-bark-500">Order not found.</div>
  }
  const order = data as Order

  let ref = null
  const { data: existing } = await supabaseAdmin
    .from('referrals').select('*').eq('order_id', id).maybeSingle()
  ref = existing
  if (!ref && REFERRALS_ACTIVE) {
    ref = await ensureReferralForOrder(order.id, order.customer_email).catch(() => null)
  }

  if (!ref) {
    return (
      <div className="p-12 max-w-md font-sans text-sm text-bark-500 leading-relaxed">
        No referral code exists for this order
        {REFERRALS_ACTIVE
          ? ' and one could not be created — check the Vercel logs.'
          : ' — the referral program is switched off (REFERRALS_ACTIVE is not set), so codes are not being minted.'}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#efece6] print:bg-white flex items-start justify-center pt-16 print:pt-0">
      <PrintButton />
      <style>{`@media print { @page { size: 105mm 74mm; margin: 0; } }`}</style>
      {/* A7 landscape: 105mm × 74mm */}
      <div className="bg-[#faf7f2] border border-[#e2d8c8] print:border-0 w-[105mm] h-[74mm] px-[9mm] py-[8mm] flex gap-[7mm] items-center">
        <div className="flex-1 min-w-0">
          <p className="font-playfair text-[15px] text-espresso leading-tight mb-[3mm]">Share a little lavender.</p>
          <p className="font-sans text-[9.5px] leading-[1.6] text-espresso-light mb-[3mm]">
            Give a friend $15 off their first Petite Lavande box — and when they use it,
            we&rsquo;ll send you $15 off your next one.
          </p>
          <span className="inline-block font-mono text-[11px] tracking-[0.18em] bg-white border border-dashed border-[#c9a84c] px-[3mm] py-[1.5mm]">
            {ref.code}
          </span>
          <p className="font-sans text-[7px] tracking-[0.12em] uppercase text-[#9c7c5a] mt-[2.5mm]">
            Scan, or use the code at petitelavande.com
          </p>
        </div>
        <div className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/referral/qr/${ref.code}`} alt={`QR code for ${ref.code}`} className="w-[26mm] h-[26mm] bg-white" />
        </div>
      </div>
    </div>
  )
}
