import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyGiftNoteToken } from '@/lib/gift-note'
import { supabaseAdmin } from '@/lib/supabase'
import { NoteActions } from './NoteActions'

// Build 17 — the recipient's gift-note page, reached from their single
// email. Signed expiring token; invalid/expired tokens get a gentle page,
// never an error.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'A Note For You',
  robots: { index: false, follow: false },
}

export default async function GiftNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const orderId = verifyGiftNoteToken(token)
  const { data: order } = orderId
    ? await supabaseAdmin.from('orders')
        .select('id, customer_name, recipient_name, letter_content')
        .eq('id', orderId).maybeSingle()
    : { data: null }

  return (
    <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <p className="font-sans text-[11px] tracking-[0.3em] uppercase font-bold text-[#c9a84c] mb-1">Petite Lavande</p>
        <p className="font-playfair italic text-[13px] text-[#9c7c5a] mb-8">Fait avec amour, pour vous</p>

        {order ? (
          <>
            <h1 className="font-playfair text-2xl sm:text-3xl text-espresso mb-6">
              A note from {order.customer_name}
            </h1>
            {order.letter_content ? (
              <div className="bg-white border border-[#e2d8c8] p-7 mb-6 text-left">
                <p className="font-playfair italic text-[15px] leading-[1.8] text-[#5a3e28] whitespace-pre-wrap">{order.letter_content}</p>
              </div>
            ) : (
              <p className="font-sans text-sm text-espresso-light mb-6">
                {order.customer_name} sent you a Petite Lavande box — their handwritten note is inside it.
              </p>
            )}
            <NoteActions token={token} senderName={order.customer_name} />
          </>
        ) : (
          <>
            <h1 className="font-playfair text-2xl text-espresso mb-4">This note has drifted away</h1>
            <p className="font-sans text-sm text-espresso-light leading-relaxed mb-8">
              The link may have expired. The printed note is tucked inside the box itself — and we&rsquo;re here if you need anything.
            </p>
            <Link href="/" className="inline-block bg-[#7A8E7C] text-white font-sans text-[12px] tracking-[0.2em] uppercase py-3.5 px-10 hover:bg-[#6b7d6d] transition-colors">
              Visit Petite Lavande
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
