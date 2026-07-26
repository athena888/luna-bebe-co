'use client'

import { useEffect, useState } from 'react'

// Portal → UGC — the approval grid (Build 9). Nothing a customer uploads is
// ever used anywhere until it's approved here; "featured" marks the best for
// campaigns and landing pages. Consent is stored verbatim per asset.

interface Asset {
  id: string
  contact_email: string
  order_id: string | null
  media_type: string
  consent_marketing: boolean
  status: 'new' | 'approved' | 'rejected' | 'featured'
  created_at: string
  signedUrl?: string
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gold-100 text-gold-600',
  approved: 'bg-sage-100 text-sage-500',
  featured: 'bg-purple-100 text-purple-700',
  rejected: 'bg-cream-200 text-bark-400',
}

export default function UgcPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/portal/ugc').then(r => r.json()).then(d => setAssets(d.assets ?? [])).finally(() => setLoading(false))
  }, [])

  async function setStatus(id: string, status: Asset['status']) {
    setBusy(id)
    try {
      const res = await fetch('/api/portal/ugc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
      })
      if (res.ok) setAssets(a => a.map(x => x.id === id ? { ...x, status } : x))
    } finally {
      setBusy(null)
    }
  }

  const btn = 'font-sans text-[10px] tracking-[0.05em] px-2.5 py-1 border border-cream-300 bg-white hover:bg-cream-100 transition-colors disabled:opacity-40'

  return (
    <div>
      <h1 className="text-2xl text-bark-600 mb-1">Customer Photos</h1>
      <p className="font-sans text-sm text-bark-400 mb-6">
        Nothing is used anywhere without your approval here. Consent wording is stored verbatim per photo — marketing use only where the box was ticked.
      </p>

      {loading ? (
        <p className="font-sans text-sm text-bark-400">Loading…</p>
      ) : assets.length === 0 ? (
        <p className="font-sans text-sm text-bark-400">No customer photos yet — they arrive through the review form on product pages.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map(a => (
            <div key={a.id} className="bg-cream-50 rounded-xl border border-cream-200 overflow-hidden">
              <div className="aspect-square bg-cream-200 flex items-center justify-center overflow-hidden">
                {a.signedUrl && a.media_type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.signedUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{a.media_type === 'video' ? '🎥' : '📷'}</span>
                )}
              </div>
              <div className="p-2.5 font-sans text-[11px] text-bark-500">
                <p className="truncate">{a.contact_email}</p>
                <p className="text-bark-400">{a.order_id ? `order ${a.order_id.slice(-6)}` : 'no order'} · {a.consent_marketing ? 'consented' : 'NO marketing consent'}</p>
                <span className={`inline-block text-[9px] tracking-[0.08em] uppercase font-bold px-2 py-0.5 rounded-full mt-1.5 ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {a.status !== 'approved' && a.status !== 'featured' && (
                    <button className={btn} disabled={busy === a.id} onClick={() => setStatus(a.id, 'approved')}>Approve</button>
                  )}
                  {a.status === 'approved' && (
                    <button className={btn} disabled={busy === a.id} onClick={() => setStatus(a.id, 'featured')}>Feature</button>
                  )}
                  {a.status === 'featured' && (
                    <button className={btn} disabled={busy === a.id} onClick={() => setStatus(a.id, 'approved')}>Unfeature</button>
                  )}
                  {a.status !== 'rejected' && (
                    <button className={btn} disabled={busy === a.id} onClick={() => setStatus(a.id, 'rejected')}>Reject</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
