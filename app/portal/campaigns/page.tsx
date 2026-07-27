'use client'

import { useEffect, useState } from 'react'
import { MarketingTabs } from '@/components/portal/MarketingTabs'

// Portal → Campaigns (Build 8) — compose a one-off email, pick segments,
// send a test to yourself, then send for real. Backed by /api/portal/campaigns.
// The real send unlocks only after a test has been sent for the current draft.

const SEGMENTS = [
  { key: 'parent_to_be', label: 'Parents-to-be' },
  { key: 'grandparent', label: 'Grandparents' },
  { key: 'friend_coworker', label: 'Friends / coworkers' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'unknown', label: 'Unknown' },
] as const

type CampaignHistory = { slug: string; sent: number; lastAt: string }

const labelCls = 'block font-sans text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold mb-1 mt-3 first:mt-0'
const fieldCls = 'w-full font-sans text-[13px] px-3 py-2 border border-cream-300 bg-cream-50 rounded-lg text-bark-600 focus:outline-none focus:border-bark-400'

export default function CampaignsPage() {
  const [slug, setSlug] = useState('')
  const [subject, setSubject] = useState('')
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaHref, setCtaHref] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set(['parent_to_be', 'grandparent', 'friend_coworker', 'unknown']))
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [recipients, setRecipients] = useState<number | null>(null)
  const [history, setHistory] = useState<CampaignHistory[]>([])
  const [testedDraft, setTestedDraft] = useState('')
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [msg, setMsg] = useState('')

  const draftKey = JSON.stringify({ slug, subject, heading, body, ctaLabel, ctaHref, seg: [...picked].sort() })
  const paragraphs = body.split('\n').map(p => p.trim()).filter(Boolean)
  const ready = slug.trim() && subject.trim() && heading.trim() && paragraphs.length > 0 && picked.size > 0

  useEffect(() => {
    fetch('/api/portal/campaigns')
      .then(r => r.json())
      .then(d => { setCounts(d.counts ?? {}); setHistory(d.campaigns ?? []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!picked.size) { setRecipients(0); return }
    const t = setTimeout(() => {
      fetch('/api/portal/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'count', segments: [...picked] }),
      }).then(r => r.json()).then(d => setRecipients(d.recipients ?? null)).catch(() => setRecipients(null))
    }, 300)
    return () => clearTimeout(t)
  }, [picked])

  function toggle(key: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function act(mode: 'test' | 'send') {
    if (!ready || busy) return
    if (mode === 'send' && testedDraft !== draftKey) return
    setBusy(mode); setMsg('')
    try {
      const res = await fetch('/api/portal/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, slug, subject, heading, paragraphs,
          ctaLabel: ctaLabel || undefined, ctaHref: ctaHref || undefined,
          segments: [...picked],
        }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error || 'Something went wrong'); return }
      if (mode === 'test') {
        setTestedDraft(draftKey)
        setMsg(`Test sent to ${d.testTo} — check your inbox, then the real send unlocks.`)
      } else {
        setMsg(`Sent to ${d.sent} people${d.failed ? ` (${d.failed} failed)` : ''}.`)
        setTestedDraft('')
        setHistory(h => [{ slug: slug.trim().toLowerCase(), sent: d.sent, lastAt: new Date().toISOString() }, ...h])
        setSlug(''); setSubject(''); setHeading(''); setBody(''); setCtaLabel(''); setCtaHref('')
      }
    } catch {
      setMsg('Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-8">
      <MarketingTabs active="campaigns" />
      <h1 className="text-2xl text-bark-600 mb-1">Campaigns</h1>
      <p className="font-sans text-sm text-bark-400 mb-6">
        One-off emails to your opted-in list. The test lands in your inbox first — the real send unlocks after.
      </p>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 max-w-5xl">
        {/* Compose */}
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 h-fit">
          <label className={labelCls}>Campaign name (one send per name)</label>
          <input className={fieldCls} value={slug} onChange={e => setSlug(e.target.value)} placeholder="reopening-august" />
          <label className={labelCls}>Subject</label>
          <input className={fieldCls} value={subject} onChange={e => setSubject(e.target.value)} placeholder="We're back — the boxes are packed again 🌿" />
          <label className={labelCls}>Heading</label>
          <input className={fieldCls} value={heading} onChange={e => setHeading(e.target.value)} placeholder="The ribbons are tied again" />
          <label className={labelCls}>Body (one paragraph per line)</label>
          <textarea className={`${fieldCls} h-28 resize-y`} value={body} onChange={e => setBody(e.target.value)} placeholder={'First paragraph…\nSecond paragraph…'} />
          <label className={labelCls}>Button label · link</label>
          <div className="flex gap-2">
            <input className={fieldCls} value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="See the Boxes" />
            <input className={fieldCls} value={ctaHref} onChange={e => setCtaHref(e.target.value)} placeholder="/boxes" />
          </div>
          <div className="flex gap-2.5 mt-4 flex-wrap items-center">
            <button onClick={() => act('test')} disabled={!ready || busy !== null}
              className="px-5 py-3 rounded-lg bg-white border border-cream-300 font-sans text-[11px] tracking-[0.15em] uppercase font-semibold text-bark-600 hover:bg-cream-100 transition-colors disabled:opacity-40">
              {busy === 'test' ? 'Sending…' : 'Send Test to Me'}
            </button>
            <button onClick={() => act('send')} disabled={!ready || busy !== null || testedDraft !== draftKey}
              title={testedDraft !== draftKey ? 'Send yourself a test of this exact draft first' : undefined}
              className="px-5 py-3 rounded-lg bg-[#7A8E7C] font-sans text-[11px] tracking-[0.15em] uppercase font-semibold text-white hover:bg-[#6b7d6d] transition-colors disabled:opacity-40">
              {busy === 'send' ? 'Sending…' : `Send to ${recipients ?? '…'} People`}
            </button>
          </div>
          {msg && <p className="font-sans text-xs text-bark-500 mt-3">{msg}</p>}
        </div>

        {/* Audience + preview + history */}
        <div className="space-y-4">
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
            <p className={labelCls}>Send to</p>
            {SEGMENTS.map(s => (
              <label key={s.key} className="flex items-center gap-2.5 font-sans text-[13px] py-1.5 border-b border-cream-200/60 last:border-0 cursor-pointer">
                <input type="checkbox" checked={picked.has(s.key)} onChange={() => toggle(s.key)} className="accent-[#7A8E7C] w-4 h-4" />
                <span className="flex-1 font-semibold text-bark-600">{s.label}</span>
                <span className="text-xs text-bark-400">{counts[s.key] ?? 0} opted in</span>
              </label>
            ))}
            <div className="mt-3 rounded-lg bg-sage-100/50 border border-sage-200 px-3 py-2.5 font-sans text-xs text-sage-500">
              {recipients ?? '…'} recipients — opted in, minus unsubscribes
            </div>
          </div>

          <div>
            <p className={labelCls}>Live preview</p>
            <div className="bg-white rounded-2xl border border-cream-200 p-5">
              <p className="font-sans text-[10px] tracking-[3px] uppercase text-gold-500 text-center mb-1">Petite Lavande</p>
              <p className="font-serif italic text-[11px] text-bark-400 text-center mb-3.5">Fait avec amour, pour vous</p>
              <p className="text-xl text-center mb-3.5">{heading || 'Your heading'}</p>
              <div className="bg-[#faf7f2] rounded-xl p-4">
                {(paragraphs.length ? paragraphs : ['Your body copy appears here…']).map((p, i) => (
                  <p key={i} className="font-sans text-xs leading-relaxed text-[#5a3e28] mb-2.5 last:mb-0">{p}</p>
                ))}
                {ctaLabel && (
                  <div className="text-center mt-2">
                    <span className="inline-block bg-gold-400 text-bark-600 font-sans text-[10.5px] font-semibold tracking-wide uppercase px-5 py-2.5 rounded-full">{ctaLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
              <p className={labelCls}>Sent campaigns</p>
              {history.map(h => (
                <div key={h.slug + h.lastAt} className="flex justify-between font-sans text-xs py-1.5 border-b border-cream-200/60 last:border-0">
                  <span className="text-bark-600">{h.slug}</span>
                  <span className="text-bark-400">
                    {h.sent} sent{h.lastAt ? ` · ${new Date(h.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
