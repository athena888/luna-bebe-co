import type { Metadata } from 'next'
import { getShipmentByToken } from '@/lib/first-year-db'
import { ConfirmForm } from './ConfirmForm'

export const metadata: Metadata = { title: 'Confirm the size', robots: { index: false } }
export const dynamic = 'force-dynamic'

// Public, login-free size confirmation reached from the advance-notice email.
export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const shipment = await getShipmentByToken(token)
  const baby = shipment?.order?.recipient_name?.trim() || 'your little one'

  return (
    <main className="min-h-screen bg-[#FBF4EA] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-sans text-[10px] tracking-[0.5em] uppercase text-[#9A80BD] mb-3">The First Year · by Petite Lavande</p>

        {!shipment ? (
          <>
            <h1 className="font-serif text-2xl text-espresso mb-3">This link is no longer active</h1>
            <p className="font-cormorant text-lg text-[#6F5B4D]">It may have already been used. If you need help, just reply to our email.</p>
          </>
        ) : shipment.status !== 'pending' ? (
          <>
            <h1 className="font-serif text-2xl text-espresso mb-2">Already confirmed</h1>
            <p className="font-cormorant text-lg text-[#6F5B4D]">We have {baby}&rsquo;s <strong>{shipment.label}</strong> shipment set{shipment.planned_size ? <> for size <strong>{shipment.planned_size}</strong></> : ''}. 💛</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-[2rem] text-espresso leading-tight mb-3">{baby} is growing</h1>
            <p className="font-cormorant text-lg text-[#6F5B4D] leading-relaxed mb-8">
              {baby}&rsquo;s <strong>{shipment.label}</strong> shipment is almost ready. Choose the size that fits the moment, and we&rsquo;ll send it just right.
            </p>
            <ConfirmForm token={token} initialSize={shipment.planned_size} />
          </>
        )}
      </div>
    </main>
  )
}
