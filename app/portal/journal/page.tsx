'use client'

import { useState, useEffect } from 'react'
import { Loader, Plus, Trash2, Check, ArrowLeft } from 'lucide-react'

interface PostLite {
  id: string
  slug: string
  title: string
  metaDescription: string
  excerpt: string
  date: string
  readMins: number
  published: boolean
  bodyText: string
}
type Draft = Partial<PostLite>

const labelCls = 'block font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-1.5'
const inputCls = 'w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400'

function blankDraft(): Draft {
  return { title: '', slug: '', date: new Date().toISOString().slice(0, 10), readMins: 3, excerpt: '', metaDescription: '', bodyText: '', published: false }
}

export default function JournalPortal() {
  const [posts, setPosts] = useState<PostLite[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/portal/journal')
      const d = await r.json()
      setPosts(d.posts ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const set = (k: keyof Draft, v: string | number | boolean) => setEditing(e => ({ ...(e ?? {}), [k]: v }))

  async function save() {
    if (!editing) return
    setSaving(true); setErr('')
    try {
      const method = editing.id ? 'PUT' : 'POST'
      const r = await fetch('/api/portal/journal', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Save failed'); return }
      setEditing(null); await load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this post permanently?')) return
    await fetch('/api/portal/journal', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEditing(null); await load()
  }

  // ── Editor ──
  if (editing) {
    const e = editing
    return (
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setEditing(null)} className="flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors font-sans text-sm">
            <ArrowLeft size={16} /> All posts
          </button>
          <div className="flex items-center gap-3">
            {e.id && <button onClick={() => remove(e.id!)} className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.1em] uppercase text-bark-400 hover:text-red-500 transition-colors"><Trash2 size={14} /> Delete</button>}
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 transition-colors disabled:opacity-40">
              {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-cream-300 rounded-xl p-6 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={e.title ?? ''} onChange={ev => set('title', ev.target.value)} placeholder="What to Put in a Postpartum Care Package" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className={labelCls}>Slug (URL) — optional</label>
              <input className={inputCls} value={e.slug ?? ''} onChange={ev => set('slug', ev.target.value)} placeholder="auto from title" />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={e.date ?? ''} onChange={ev => set('date', ev.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Read time (min)</label>
              <input type="number" min={1} className={inputCls} value={e.readMins ?? 3} onChange={ev => set('readMins', Number(ev.target.value))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Excerpt (shown in the list)</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={e.excerpt ?? ''} onChange={ev => set('excerpt', ev.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Meta description (SEO)</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={e.metaDescription ?? ''} onChange={ev => set('metaDescription', ev.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Body</label>
            <p className="font-sans text-[11px] text-bark-400 mb-2 leading-relaxed">
              Write naturally. Start a line with <code className="bg-cream-200/70 px-1 rounded">## </code> for a subheading and <code className="bg-cream-200/70 px-1 rounded">- </code> for a bullet. Blank lines separate paragraphs.
            </p>
            <textarea rows={16} className={inputCls + ' leading-relaxed font-mono text-[13px]'} value={e.bodyText ?? ''} onChange={ev => set('bodyText', ev.target.value)} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input type="checkbox" checked={!!e.published} onChange={ev => set('published', ev.target.checked)} className="w-5 h-5 accent-bark-600" />
            <span className="font-sans text-sm text-bark-600">Published <span className="text-bark-400">(unchecked = draft, hidden from the site)</span></span>
          </label>
          {err && <p className="font-sans text-xs text-red-500">{err}</p>}
        </div>
      </div>
    )
  }

  // ── List ──
  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Journal</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">Write and publish posts — no code needed. Built-in starter posts also appear on the site.</p>
        </div>
        <button onClick={() => setEditing(blankDraft())} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors shrink-0">
          <Plus size={15} /> New post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 py-10 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>
      ) : posts.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-8">No posts yet. Click “New post” to write your first — or rely on the built-in starters already on the site.</p>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <button key={p.id} onClick={() => setEditing(p)} className="w-full text-left bg-white border border-cream-200 rounded-lg p-4 hover:border-bark-300 transition-colors flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full ${p.published ? 'bg-sage-200 text-sage-600' : 'bg-cream-200 text-bark-400'}`}>{p.published ? 'Published' : 'Draft'}</span>
                  <span className="font-sans text-[10px] text-bark-400">{p.date} · {p.readMins} min</span>
                </div>
                <p className="font-serif text-lg text-bark-600 truncate">{p.title}</p>
                <p className="font-sans text-xs text-bark-400 truncate">/{p.slug}</p>
              </div>
              <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Edit →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
