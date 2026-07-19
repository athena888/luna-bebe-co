'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader, Plus, Trash2, ExternalLink, Gift, Camera } from 'lucide-react'

// Creator gifting tracker — the influencer half of the outreach CRM.
// Pipeline: add → mark gifted → mark posted (post URL + content rights).
// "Gifted, not yet posted" floats to the top: that's the follow-up list.

interface Creator {
  id: string
  handle: string
  platform: string
  followers: number | null
  niche: string | null
  email: string | null
  gifted_at: string | null
  posted: boolean
  post_url: string | null
  content_rights: boolean
  notes: string | null
  created_at: string
}

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'pinterest', 'blog']

function profileUrl(c: Creator): string | null {
  switch (c.platform) {
    case 'instagram': return `https://instagram.com/${c.handle}`
    case 'tiktok': return `https://tiktok.com/@${c.handle}`
    case 'youtube': return `https://youtube.com/@${c.handle}`
    case 'pinterest': return `https://pinterest.com/${c.handle}`
    default: return null
  }
}

function fmtFollowers(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ handle: '', platform: 'instagram', followers: '', niche: '', email: '' })

  useEffect(() => {
    fetch('/api/portal/creators')
      .then(r => r.json())
      .then(d => {
        if (d.creators) setCreators(d.creators)
        else setNotice('Creators table not ready — run migration §33.')
      })
      .catch(() => setNotice('Failed to load — refresh to retry.'))
      .finally(() => setLoading(false))
  }, [])

  async function addCreator(e: React.FormEvent) {
    e.preventDefault()
    if (!form.handle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/portal/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.creator) {
        setCreators(prev => [d.creator, ...prev])
        setForm({ handle: '', platform: 'instagram', followers: '', niche: '', email: '' })
      } else setNotice(d.error || 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  async function patch(id: string, fields: Partial<Creator>) {
    setCreators(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c))
    const res = await fetch('/api/portal/creators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    if (!res.ok) setNotice('Save failed — refresh and retry.')
  }

  async function remove(id: string) {
    if (!confirm('Remove this creator?')) return
    setCreators(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/portal/creators?id=${id}`, { method: 'DELETE' })
  }

  const awaitingPost = creators.filter(c => c.gifted_at && !c.posted)
  const toGift = creators.filter(c => !c.gifted_at)
  const posted = creators.filter(c => c.posted)

  function Row({ c, highlight }: { c: Creator; highlight?: boolean }) {
    const url = profileUrl(c)
    return (
      <div className={`rounded-xl border p-4 ${highlight ? 'bg-gold-100/20 border-gold-300/60' : 'bg-cream-50 border-cream-200'}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-sm font-semibold text-bark-700">@{c.handle}</span>
              <span className="font-sans text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded bg-cream-200 text-bark-500">{c.platform}</span>
              <span className="font-sans text-xs text-bark-400">{fmtFollowers(c.followers)} followers</span>
              {c.niche && <span className="font-sans text-xs text-bark-400">· {c.niche}</span>}
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:text-gold-600"><ExternalLink size={12} /></a>}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {c.gifted_at
                ? <span className="font-sans text-[11px] text-bark-500">🎁 Gifted {daysSince(c.gifted_at)}d ago</span>
                : <span className="font-sans text-[11px] text-bark-400">Not gifted yet</span>}
              {c.posted && c.post_url && (
                <a href={c.post_url} target="_blank" rel="noopener noreferrer" className="font-sans text-[11px] text-sage-500 underline underline-offset-2">view post</a>
              )}
              {c.posted && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={c.content_rights} onChange={e => patch(c.id, { content_rights: e.target.checked })} className="accent-sage-500 w-3.5 h-3.5" />
                  <span className="font-sans text-[11px] text-bark-500">content rights</span>
                </label>
              )}
            </div>
            <input
              type="text"
              defaultValue={c.notes ?? ''}
              placeholder="Notes…"
              onBlur={e => { if (e.target.value !== (c.notes ?? '')) patch(c.id, { notes: e.target.value || null }) }}
              className="mt-2 w-full max-w-md px-2 py-1 bg-transparent border-b border-cream-300 font-sans text-xs text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-gold-400"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!c.gifted_at && (
              <button
                onClick={() => patch(c.id, { gifted_at: new Date().toISOString() })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-100 text-gold-600 font-sans text-xs font-semibold hover:bg-gold-200 transition-colors"
              >
                <Gift size={12} /> Mark gifted
              </button>
            )}
            {c.gifted_at && !c.posted && (
              <button
                onClick={() => {
                  const postUrl = prompt('Post URL (optional):') ?? ''
                  patch(c.id, { posted: true, post_url: postUrl.trim() || null })
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-100 text-sage-600 font-sans text-xs font-semibold hover:bg-sage-200 transition-colors"
              >
                <Camera size={12} /> Mark posted
              </button>
            )}
            <button onClick={() => remove(c.id)} className="text-bark-400/50 hover:text-rose-400 transition-colors" aria-label="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-bark-700">Creators</h1>
        <Link href="/portal/outreach" className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
          ← Morning Review
        </Link>
      </div>
      <p className="font-sans text-xs text-bark-400 mb-6">
        Gifting pipeline: add a creator → mark gifted when the box ships → mark posted with the link. Rights checkbox = they agreed you can reuse the content.
      </p>
      {notice && <p className="font-sans text-xs text-rose-400 mb-4">{notice}</p>}

      {/* Add form */}
      <form onSubmit={addCreator} className="bg-cream-50 border border-cream-200 rounded-xl p-4 mb-8 flex flex-wrap gap-2 items-center">
        <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@handle" required
          className="flex-1 min-w-[120px] px-3 py-2 border border-cream-300 bg-white font-sans text-sm text-bark-600 rounded focus:outline-none focus:border-gold-400" />
        <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
          className="px-2 py-2 border border-cream-300 bg-white font-sans text-sm text-bark-600 rounded focus:outline-none capitalize">
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={form.followers} onChange={e => setForm(f => ({ ...f, followers: e.target.value }))} placeholder="Followers" inputMode="numeric"
          className="w-24 px-3 py-2 border border-cream-300 bg-white font-sans text-sm text-bark-600 rounded focus:outline-none focus:border-gold-400" />
        <input value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="Niche (e.g. new-mom life)"
          className="flex-1 min-w-[140px] px-3 py-2 border border-cream-300 bg-white font-sans text-sm text-bark-600 rounded focus:outline-none focus:border-gold-400" />
        <button type="submit" disabled={adding}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bark-600 text-cream-50 font-sans text-xs font-semibold hover:bg-bark-700 transition-colors disabled:opacity-50">
          {adding ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />} Add
        </button>
      </form>

      {loading ? (
        <p className="font-sans text-sm text-bark-400">Loading…</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">
              Gifted, not yet posted {awaitingPost.length > 0 && `(${awaitingPost.length})`}
            </h2>
            {awaitingPost.length === 0
              ? <p className="font-sans text-xs text-bark-400/70">Nobody waiting — gift someone below.</p>
              : <div className="space-y-2">{awaitingPost.map(c => <Row key={c.id} c={c} highlight />)}</div>}
          </section>

          <section className="mb-8">
            <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">To gift {toGift.length > 0 && `(${toGift.length})`}</h2>
            {toGift.length === 0
              ? <p className="font-sans text-xs text-bark-400/70">No prospects yet — add creators above.</p>
              : <div className="space-y-2">{toGift.map(c => <Row key={c.id} c={c} />)}</div>}
          </section>

          <section>
            <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">Posted {posted.length > 0 && `(${posted.length})`}</h2>
            {posted.length === 0
              ? <p className="font-sans text-xs text-bark-400/70">No posts yet.</p>
              : <div className="space-y-2">{posted.map(c => <Row key={c.id} c={c} />)}</div>}
          </section>
        </>
      )}
    </div>
  )
}
