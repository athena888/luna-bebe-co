'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, Package, Clock } from 'lucide-react'

interface ShipmentRow {
  id: string; shipment_index: number | null; label: string | null
  status: 'pending' | 'size_confirmed' | 'shipped'
  planned_size: string | null; ship_by_date: string | null; notice_sent_at: string | null
  recipient_email: string | null
  order: { customer_name: string | null; customer_email: string | null; recipient_name: string | null } | null
}

function fmt(d: string | null) { return d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function statusStyle(s: string) {
  if (s === 'shipped') return 'bg-sage-100 text-sage-600'
  if (s === 'size_confirmed') return 'bg-gold-100 text-gold-600'
  return 'bg-cream-200 text-bark-600' // pending
}
function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.round((new Date(`${d}T12:00:00Z`).getTime() - Date.now()) / 86400000)
}

export default function ShipmentsPage() {
  const [rows, setRows] = useState<ShipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sizes, setSizes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { const d = await (await fetch('/api/portal/shipments')).json(); setRows(d.shipments ?? []) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function act(id: string, action: 'confirm' | 'ship', size?: string) {
    setBusy(id)
    setRows(rs => rs.map(r => r.id === id ? { ...r, status: action === 'confirm' ? 'size_confirmed' : 'shipped', planned_size: action === 'confirm' ? (size ?? r.planned_size) : r.planned_size } : r))
    try {
      await fetch('/api/portal/shipments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, size }) })
    } finally { setBusy(null) }
  }

  const upcoming = rows.filter(r => r.status !== 'shipped')

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-bark-600 flex items-center gap-2"><Package size={24} className="text-gold-400" /> First Year Shipments</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Every scheduled shipment from a First Year set, soonest first. Confirm the size, then mark it shipped.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 text-sm py-10"><Loader size={14} className="animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-8">No First Year shipments yet. They appear here when someone buys the set.</p>
      ) : (
        <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-100">
                {['Ship by', 'Shipment', 'Customer', 'Status', 'Size', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const d = daysUntil(r.ship_by_date)
                const soon = d != null && d <= 21 && r.status === 'pending'
                return (
                  <tr key={r.id} className={`border-b border-cream-200 last:border-0 ${r.status === 'shipped' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-sans text-sm text-bark-700">{fmt(r.ship_by_date)}</span>
                      {soon && <span className="ml-2 font-sans text-[9px] uppercase tracking-[0.1em] text-rose-500 inline-flex items-center gap-0.5"><Clock size={9} />{d}d</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-bark-600">{r.shipment_index ? `${r.shipment_index} · ` : ''}{r.label}</td>
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm text-bark-700">{r.order?.recipient_name || r.order?.customer_name || '—'}</p>
                      <span className="font-sans text-[11px] text-bark-400">{r.recipient_email || r.order?.customer_email}</span>
                    </td>
                    <td className="px-4 py-3"><span className={`font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${statusStyle(r.status)}`}>{r.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 font-sans text-sm text-bark-600">{r.planned_size || '—'}</td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <input value={sizes[r.id] ?? ''} onChange={e => setSizes(s => ({ ...s, [r.id]: e.target.value }))} placeholder="size" className="w-20 px-2 py-1 border border-cream-300 rounded text-xs text-bark-700 focus:outline-none focus:border-bark-400" />
                          <button onClick={() => act(r.id, 'confirm', sizes[r.id])} disabled={busy === r.id} className="font-sans text-[10px] tracking-[0.1em] uppercase text-cream-50 bg-bark-600 hover:bg-bark-700 rounded px-2.5 py-1.5 disabled:opacity-50">Confirm</button>
                        </div>
                      ) : r.status === 'size_confirmed' ? (
                        <button onClick={() => act(r.id, 'ship')} disabled={busy === r.id} className="inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.1em] uppercase text-sage-600 hover:text-sage-700">
                          <Check size={12} /> Mark shipped
                        </button>
                      ) : (
                        <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-bark-300">Shipped</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <p className="font-sans text-xs text-bark-400 mt-3">{upcoming.length} upcoming · {rows.length - upcoming.length} shipped.</p>
      )}
    </div>
  )
}
