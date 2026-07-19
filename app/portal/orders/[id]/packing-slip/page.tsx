import { supabaseAdmin } from '@/lib/supabase'
import type { Order, Product } from '@/types'
import { PrintButton } from './PrintButton'

// Printable packing slip. Gift orders (ship_to_recipient) hide all prices and
// render the gift note in a handwriting-style face; regular orders include
// prices. Reached from Portal → Orders → "Packing slip".

export const dynamic = 'force-dynamic'

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

type LineItem = Product & { selectedColor?: string; selectedSize?: string; selectedStyle?: string; qty?: number; quantity?: number }

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin.from('orders').select('*').eq('id', id).maybeSingle()

  if (!data) {
    return <div className="p-12 font-sans text-sm text-bark-500">Order not found.</div>
  }

  const order = data as Order
  const isGift = !!order.ship_to_recipient
  const addr = order.shipping_address
  const items = (order.selected_items ?? []) as LineItem[]
  const ref = (order.tracking_number ?? order.id).slice(-8).toUpperCase()

  return (
    <div className="min-h-screen bg-white text-[#3d2c1e] print:bg-white">
      <PrintButton />
      <div className="max-w-[600px] mx-auto px-10 py-14 print:px-0 print:py-6">

        {/* Brand header */}
        <header className="text-center mb-10">
          <p className="font-sans text-[11px] tracking-[0.35em] uppercase text-gold-500 mb-2">Petite Lavande</p>
          <p className="font-serif text-lg">Hand-packed in Seattle</p>
          <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mt-1">Order {ref}</p>
        </header>

        {/* Addressee */}
        <section className="mb-8">
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-1.5">
            {isGift ? 'A gift for' : 'Deliver to'}
          </p>
          <p className="font-serif text-base leading-relaxed">
            {isGift ? (order.recipient_name || addr.name) : addr.name}<br />
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
            {addr.city}, {addr.state} {addr.zip}
          </p>
          {isGift && (
            <p className="font-sans text-xs text-bark-500 mt-2">With love from {order.customer_name}</p>
          )}
        </section>

        {/* Items — no prices on gift orders */}
        <section className="mb-8">
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-2">Inside this box</p>
          <table className="w-full border-t border-[#e8ddd0]">
            <tbody>
              {items.map((item, i) => {
                const variant = [item.selectedColor, item.selectedSize, item.selectedStyle].filter(Boolean).join(' · ')
                const qty = item.qty ?? item.quantity ?? 1
                return (
                  <tr key={i} className="border-b border-[#e8ddd0]">
                    <td className="py-2.5 pr-3">
                      <p className="font-sans text-sm">{item.name}</p>
                      {variant && <p className="font-sans text-[11px] text-bark-400 capitalize">{variant}</p>}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-sans text-xs text-bark-400 whitespace-nowrap">{qty > 1 ? `× ${qty}` : ''}</td>
                    {!isGift && <td className="py-2.5 text-right font-sans text-sm whitespace-nowrap">{fmt(item.price * qty)}</td>}
                  </tr>
                )
              })}
              {!isGift && (
                <tr>
                  <td className="py-2.5 font-sans text-xs text-bark-400" colSpan={2}>Total (incl. box &amp; shipping)</td>
                  <td className="py-2.5 text-right font-serif text-base">{fmt(order.total_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Gift note — handwriting-style */}
        {isGift && order.special_note && (
          <section className="mb-10 border border-[#e8ddd0] rounded px-8 py-6 text-center">
            <p className="text-xl leading-relaxed" style={{ fontFamily: "'Segoe Script', 'Bradley Hand', 'Brush Script MT', cursive" }}>
              {order.special_note}
            </p>
          </section>
        )}

        <footer className="text-center">
          <p className="font-sans text-[11px] text-bark-400 leading-relaxed">
            Every item is traced to its source — the printed card inside tells each one&rsquo;s story.<br />
            Questions? hello@petitelavande.com · petitelavande.com
          </p>
        </footer>
      </div>
    </div>
  )
}
