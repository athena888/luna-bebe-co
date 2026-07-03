'use client'

import { useState, useEffect } from 'react'
import { Loader, Check } from 'lucide-react'
import type { StoryContent } from '@/lib/story-content'
import { Field, Area } from '@/components/portal/ContentFields'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'
import { ScrimControl } from '@/components/portal/ScrimControl'
import { BackgroundBox } from '@/components/portal/BackgroundBox'

function SectionTitle({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-cream-300">
      <h2 className="font-serif text-xl text-bark-600">{n} · {title}</h2>
      {note && <p className="font-sans text-xs text-bark-400 mt-1">{note}</p>}
    </div>
  )
}

export default function StoryPortal() {
  const [c, setC] = useState<StoryContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/portal/story-content').then(r => r.json()).then(d => setC(d.content)).catch(() => {})
  }, [])

  async function save() {
    if (!c) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/portal/story-content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } finally { setSaving(false) }
  }

  if (!c) return <div className="p-8 flex items-center gap-2 text-bark-400 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>

  const setHero = (p: Partial<StoryContent['hero']>) => setC({ ...c, hero: { ...c.hero, ...p } })
  const setFounder = (p: Partial<StoryContent['founder']>) => setC({ ...c, founder: { ...c.founder, ...p } })
  const setValue = (i: number, p: Partial<StoryContent['values'][number]>) => setC({ ...c, values: c.values.map((v, j) => j === i ? { ...v, ...p } : v) })
  const setFrench = (p: Partial<StoryContent['french']>) => setC({ ...c, french: { ...c.french, ...p } })

  const toText = (a: string[]) => a.join('\n\n')
  const toParas = (s: string) => s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-bark-600">Story</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Edit the Story page — each block of text sits beside the image that goes with it. ✨ buttons suggest on-brand copy.</p>
      </div>

      {/* 1 · Founder's letter — headline + letter edited together (one section on the page) */}
      <section className="mb-12">
        <SectionTitle n="1" title="Founder’s letter" note="The headline at the top of the page and the letter beneath it — one section. The portrait floats beside the letter." />
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <div className="space-y-3">
            <div>
              <p className="font-sans text-[10px] text-bark-400 mb-1">Founder portrait</p>
              <SiteImageUploader slotKey="story.founder" context="Founder portrait on the Story page" ratio="3:4" hint="portrait, ~900×1200" />
            </div>
            <BackgroundBox appliesTo="BOTH the headline and the founder letter (one shared section)">
              <SiteImageUploader slotKey="story.hero_bg" context="Background behind the story hero heading and logo" ratio="16:9" hint="soft, light lifestyle" compact />
              <ScrimControl scrimKey="story.hero_bg" defaultScrim={{ hex: '#FBF7F0', opacity: 0.92 }} />
            </BackgroundBox>
          </div>
          <div className="space-y-3">
            <Field label="Page eyebrow (above the headline)" value={c.hero.eyebrow} onChange={v => setHero({ eyebrow: v })} ai={{ kind: 'eyebrow', context: 'small eyebrow above the Story page hero heading' }} />
            <Area label="Headline" value={c.hero.heading} onChange={v => setHero({ heading: v })} rows={2} ai={{ kind: 'title', context: 'the main hero heading for the brand Story page' }} />
            <Field label="Letter eyebrow" value={c.founder.eyebrow} onChange={v => setFounder({ eyebrow: v })} ai={{ kind: 'eyebrow', context: 'eyebrow above the founder letter' }} />
            <Area label="Letter (blank line between paragraphs)" value={toText(c.founder.paragraphs)} onChange={v => setFounder({ paragraphs: toParas(v) })} rows={10} ai={{ kind: 'body', context: 'a warm first-person founder letter for an organic baby gift brand' }} />
            <Field label="Signature" value={c.founder.signature} onChange={v => setFounder({ signature: v })} />
          </div>
        </div>
      </section>

      {/* 2 · Values */}
      <section className="mb-12">
        <SectionTitle n="2" title="What we stand for" note="Photo on the left, the three values listed on a green panel to the right." />
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <div>
            <p className="font-sans text-[10px] text-bark-400 mb-1">Left photo</p>
            <SiteImageUploader slotKey="story.values" context="Photo beside the What We Stand For values panel (lavender lifestyle)" ratio="3:4" hint="portrait or square · ~1200×1500. Until one is uploaded, the old lavender value photo is shown." compact />
          </div>
          <div className="space-y-4">
            {c.values.map((v, i) => (
              <div key={i} className="bg-white border border-cream-200 rounded-lg p-3 space-y-3">
                <Field label={`Value ${i + 1} — title`} value={v.title} onChange={val => setValue(i, { title: val })} ai={{ kind: 'title', context: 'a short brand-value title (2–3 words)' }} />
                <Area label="Body" value={v.body} onChange={val => setValue(i, { body: val })} rows={3} ai={{ kind: 'body', context: `body copy for the brand value "${v.title}"` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · French apothecary — closing section, split layout */}
      <section className="mb-12">
        <SectionTitle n="3" title="French apothecary soul" note="The closing section. The photo fills the band; text sits on a cream panel over the left half, the right half shows the photo clean." />
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <BackgroundBox appliesTo="the right half of the closing band (the left half is a cream text panel)">
            <SiteImageUploader slotKey="story.french_bg" context="Photo for the French apothecary closing section" ratio="16:9" hint="landscape lifestyle — keep the subject toward the right" compact />
          </BackgroundBox>
          <div className="space-y-3">
            <Field label="Eyebrow" value={c.french.eyebrow} onChange={v => setFrench({ eyebrow: v })} ai={{ kind: 'eyebrow', context: 'eyebrow about the French apothecary aesthetic' }} />
            <Area label="Paragraphs (blank line between)" value={toText(c.french.paragraphs)} onChange={v => setFrench({ paragraphs: toParas(v) })} rows={6} ai={{ kind: 'body', context: 'copy about a French apothecary aesthetic with PNW sourcing' }} />
            <Field label="Tagline (italic)" value={c.french.tagline} onChange={v => setFrench({ tagline: v })} ai={{ kind: 'tagline', context: 'a short evocative tagline about far-away-yet-close' }} />
          </div>
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-cream-100/95 backdrop-blur border-t border-cream-300 flex items-center gap-4">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-50">
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
        <p className="font-sans text-xs text-bark-400">Photos save instantly. Text goes live within a few minutes after saving.</p>
      </div>
    </div>
  )
}
