'use client'

import { useState, useEffect } from 'react'
import { Loader, ChevronDown, ChevronRight, Search } from 'lucide-react'

// Outbound KPIs (§33) and the contact-research backlog (§21).
//
// No open rate anywhere. There is no open tracking and there should not be —
// pixels hurt deliverability and the number tells you nothing about intent.
// Every figure here is an outcome: delivered, bounced, replied, or waiting.

interface Bucket { sent: number; replied: number }
interface Payload {
  results: {
    emailsSent: number; uniqueAccountsContacted: number; initial: number; followups: number
    viaNewPipeline: number; replied: number; positiveReplies: number; bounced: number
    hardBounced: number; replyRate: number; positiveReplyRate: number; bounceRate: number
    replyCategories: Record<string, number>
  }
  breakdowns: {
    bySegment: Record<string, Bucket>; byMetro: Record<string, Bucket>
    bySize: Record<string, Bucket>; byTier: Record<string, Bucket>; byRole: Record<string, Bucket>
  }
  inventory: {
    byStatus: Record<string, number>
    uncontactedQualified: number; uncontactedExcellent: number; needsContactResearch: number
  }
  contactResearch: Array<{
    id: string; company: string; domain: string | null; segment: string | null
    qualification_score: number | null; company_size_band: string | null
    email: string | null; email_is_generic: boolean | null; blocker: string
  }>
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

function Stat({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="bg-white border border-cream-300 rounded-xl px-3 py-2.5">
      <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-bark-400">{label}</div>
      <div className={`font-serif text-xl ${warn ? 'text-red-600' : 'text-bark-700'}`}>{value}</div>
      {sub && <div className="font-sans text-[10px] text-bark-400">{sub}</div>}
    </div>
  )
}

function Breakdown({ title, data }: { title: string; data: Record<string, Bucket> }) {
  const rows = Object.entries(data).sort((a, b) => b[1].sent - a[1].sent)
  if (!rows.length) return null
  return (
    <div>
      <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-bark-400 mb-1">{title}</div>
      <table className="w-full font-sans text-xs">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-cream-200 last:border-0">
              <td className="py-1 text-bark-600">{k.replace(/_/g, ' ').toLowerCase()}</td>
              <td className="py-1 text-right text-bark-400 tabular-nums">{v.sent} sent</td>
              <td className="py-1 text-right text-bark-700 tabular-nums w-20">
                {v.sent ? `${v.replied} (${pct(v.replied / v.sent)})` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OutreachDashboard() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(false)

  useEffect(() => {
    fetch('/api/portal/outreach-pipeline/dashboard')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-6 text-bark-400"><Loader className="animate-spin" size={18} /></div>
  if (!data) return null

  const r = data.results
  const inv = data.inventory
  // A small sample cannot support a conclusion — say so rather than implying one.
  const thin = r.emailsSent < 100

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.14em] uppercase text-bark-500 hover:text-bark-700 mb-2"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Performance
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <Stat label="Emails sent" value={r.emailsSent} sub={`${r.uniqueAccountsContacted} accounts · ${r.followups} follow-ups`} />
        <Stat label="Reply rate" value={pct(r.replyRate)} sub={`${r.replied} replies`} />
        <Stat label="Positive" value={pct(r.positiveReplyRate)} sub={`${r.positiveReplies} interested`} />
        <Stat label="Bounce rate" value={pct(r.bounceRate)} sub={`${r.hardBounced} hard`} warn={r.bounceRate > 0.03} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Qualified, uncontacted" value={inv.uncontactedQualified} sub={`${inv.uncontactedExcellent} excellent`} />
        <Stat label="Needs a contact" value={inv.needsContactResearch} sub="good companies, no buyer found" />
        <Stat label="Rejected" value={inv.byStatus.REJECTED ?? 0} sub="did not meet the bar" />
        <Stat label="Partnership queue" value={inv.byStatus.PARTNERSHIP ?? 0} sub="separate motion" />
      </div>

      {thin && (
        <p className="font-sans text-[11px] text-bark-400 italic mt-2">
          {r.emailsSent} sends is too small a sample to read into — treat these rates as directional only.
        </p>
      )}

      {open && (
        <div className="mt-3 bg-cream-50 border border-cream-300 rounded-xl p-4 grid sm:grid-cols-2 gap-5">
          <Breakdown title="By segment" data={data.breakdowns.bySegment} />
          <Breakdown title="By score tier" data={data.breakdowns.byTier} />
          <Breakdown title="By company size" data={data.breakdowns.bySize} />
          <Breakdown title="By metro" data={data.breakdowns.byMetro} />
          <Breakdown title="By buyer role" data={data.breakdowns.byRole} />
          <div>
            <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-bark-400 mb-1">Reply types</div>
            {Object.keys(r.replyCategories).length === 0
              ? <p className="font-sans text-xs text-bark-400">none yet</p>
              : Object.entries(r.replyCategories).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="flex justify-between font-sans text-xs border-b border-cream-200 py-1">
                  <span className="text-bark-600">{k.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-bark-700 tabular-nums">{v}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Contact-research backlog — good companies we simply cannot reach yet. */}
      {data.contactResearch.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setResearchOpen(o => !o)}
            className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.14em] uppercase text-bark-500 hover:text-bark-700 mb-2"
          >
            {researchOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Search size={12} /> Needs a contact ({data.contactResearch.length})
          </button>
          {researchOpen && (
            <div className="bg-white border border-cream-300 rounded-xl divide-y divide-cream-200">
              {data.contactResearch.map(c => (
                <div key={c.id} className="px-3 py-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-serif text-sm text-bark-700">{c.company}</span>
                  <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-bark-400">
                    {c.segment?.replace(/_/g, ' ').toLowerCase()} · {c.company_size_band ?? 'size unknown'}
                  </span>
                  {c.qualification_score != null && (
                    <span className="font-sans text-xs text-sage-700">score {c.qualification_score}</span>
                  )}
                  <span className="font-sans text-[11px] text-red-600 basis-full">{c.blocker}</span>
                </div>
              ))}
              <p className="px-3 py-2 font-sans text-[11px] text-bark-400 italic">
                These qualify on the company. The nightly cycle keeps looking for a named buyer;
                nothing is sent until one is found with a direct address.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
