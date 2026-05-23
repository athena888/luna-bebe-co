import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Gift, CheckCircle } from 'lucide-react'

export default function GiftCardConfirmationPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sage-100 mb-6">
            <CheckCircle size={40} className="text-sage-500" />
          </div>
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Gift Card Sent</p>
          <h1 className="font-serif text-4xl text-bark-600 mb-4">It&apos;s on its way!</h1>
          <p className="font-sans text-sm text-bark-400 leading-relaxed mb-10">
            Your gift card has been delivered to the recipient&apos;s inbox with a unique redemption code. They&apos;ll use it at checkout when building their box.
          </p>
          <div className="bg-bark-700 rounded-2xl p-6 mb-8 flex items-center gap-4 text-left">
            <Gift size={24} className="text-gold-300 shrink-0" />
            <p className="font-sans text-sm text-cream-300 leading-relaxed">
              The recipient will receive an email with their unique gift code. Codes are valid forever and redeemable at checkout.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/"><Button variant="outline" size="md">Back to Home</Button></Link>
            <Link href="/build"><Button variant="gold" size="md">Build a Box</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
