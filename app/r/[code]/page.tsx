import Link from 'next/link'
import type { Metadata } from 'next'
import { referralByCode } from '@/lib/referrals'
import { RememberReferral } from './RememberReferral'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'A Gift From a Friend',
  robots: { index: false, follow: false },
}

// Build 6 — referral redeem page. A friend lands here from the printed
// insert's QR (or by typing the short link). Valid code → stash it for
// checkout auto-apply; spent/unknown → gentle fallback, never a 404.
export default async function RedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const ref = await referralByCode(code).catch(() => null)
  const state = !ref ? 'invalid' : ref.redeemed_at ? 'used' : 'valid'

  return (
    <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-6 py-16">
      {state === 'valid' && <RememberReferral code={ref!.code} />}
      <div className="max-w-md text-center">
        <p className="font-sans text-[11px] tracking-[0.3em] uppercase font-bold text-[#c9a84c] mb-3">
          A Gift From a Friend
        </p>
        <p className="font-playfair text-xl text-espresso mb-10">Petite Lavande</p>

        {state === 'valid' && (
          <>
            <h1 className="font-playfair text-3xl sm:text-4xl text-espresso leading-tight mb-4">
              $15 toward a<br />Petite Lavande box
            </h1>
            <p className="font-sans text-[15px] leading-relaxed text-espresso-light mb-8">
              Someone who loves our boxes wants you to have one too. Your $15 is ready —
              it applies automatically at checkout on orders of $90 or more.
            </p>
            <div className="inline-block bg-white border border-dashed border-[#c9a84c] px-7 py-3 mb-2">
              <p className="font-mono text-lg tracking-[0.2em] text-espresso">{ref!.code}</p>
              <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-[#9c7c5a] mt-1">
                $15 off · applies automatically at checkout
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/build"
                className="inline-block bg-[#7A8E7C] text-white font-sans text-[13px] tracking-[0.2em] uppercase py-4 px-12 hover:bg-[#6b7d6d] transition-colors"
              >
                Start Building
              </Link>
            </div>
            <p className="font-sans text-[11px] text-[#9c7c5a] mt-6">
              One use per code · minimum order $90 · can&rsquo;t be combined with other codes
            </p>
          </>
        )}

        {state === 'used' && (
          <>
            <h1 className="font-playfair text-3xl text-espresso leading-tight mb-4">
              This code has already been used
            </h1>
            <p className="font-sans text-[15px] leading-relaxed text-espresso-light mb-8">
              Each code works once, and someone beat you to this one. The boxes are
              still here, hand-packed and waiting.
            </p>
            <Link
              href="/build"
              className="inline-block bg-[#7A8E7C] text-white font-sans text-[13px] tracking-[0.2em] uppercase py-4 px-12 hover:bg-[#6b7d6d] transition-colors"
            >
              Start Building
            </Link>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h1 className="font-playfair text-3xl text-espresso leading-tight mb-4">
              Hmm, we don&rsquo;t recognize that code
            </h1>
            <p className="font-sans text-[15px] leading-relaxed text-espresso-light mb-8">
              The link may have been typed out by hand — double-check the code on your
              card, or come see the boxes anyway.
            </p>
            <Link
              href="/build"
              className="inline-block bg-[#7A8E7C] text-white font-sans text-[13px] tracking-[0.2em] uppercase py-4 px-12 hover:bg-[#6b7d6d] transition-colors"
            >
              See the Boxes
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
