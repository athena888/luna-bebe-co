import { supabaseAdmin } from '@/lib/supabase'
import { ReplayButton } from './ReplayButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  const [failedRes, recentRes, countsRes] = await Promise.all([
    supabaseAdmin
      .from('stripe_webhook_events')
      .select('id, type, received_at, attempts, last_error')
      .eq('processed', false)
      .not('last_error', 'is', null)
      .order('received_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('stripe_webhook_events')
      .select('id, type, received_at, processed, attempts, last_error')
      .order('received_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('stripe_webhook_events')
      .select('processed, last_error'),
  ])

  const all = countsRes.data ?? []
  const counts = {
    total: all.length,
    processed: all.filter(e => e.processed).length,
    failed: all.filter(e => !e.processed && e.last_error).length,
    inFlight: all.filter(e => !e.processed && !e.last_error).length,
  }

  return { failed: failedRes.data ?? [], recent: recentRes.data ?? [], counts }
}

export default async function WebhooksPortalPage() {
  const { failed, recent, counts } = await load()

  return (
    <div className="p-8">
      <h1 className="font-serif text-3xl text-bark-600 mb-1">Stripe Webhooks</h1>
      <p className="font-sans text-sm text-bark-400 mb-8">Every event is logged. Failures can be replayed.</p>

      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total', value: counts.total, color: 'text-bark-600' },
          { label: 'Processed', value: counts.processed, color: 'text-sage-500' },
          { label: 'Failed', value: counts.failed, color: 'text-red-500' },
          { label: 'In Flight', value: counts.inFlight, color: 'text-gold-500' },
        ].map(c => (
          <div key={c.label} className="bg-cream-50 border border-cream-200 rounded-2xl p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-bark-400">{c.label}</p>
            <p className={`font-serif text-3xl mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {failed.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-xl text-bark-600 mb-3">Failed — needs replay</h2>
          <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
            <table className="w-full font-sans text-sm">
              <thead className="bg-red-100/60 text-bark-500 text-[10px] uppercase tracking-[0.2em]">
                <tr>
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Received</th>
                  <th className="text-right px-4 py-3">Attempts</th>
                  <th className="text-left px-4 py-3">Error</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {failed.map(e => (
                  <tr key={e.id} className="border-t border-red-200/50 align-top">
                    <td className="px-4 py-3 font-mono text-[10px] text-bark-500">{e.id.slice(0, 24)}…</td>
                    <td className="px-4 py-3 text-bark-600">{e.type}</td>
                    <td className="px-4 py-3 text-bark-400 text-xs">{formatDate(e.received_at)}</td>
                    <td className="px-4 py-3 text-right text-bark-600">{e.attempts}</td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate" title={e.last_error ?? ''}>{e.last_error}</td>
                    <td className="px-4 py-3 text-right">
                      <ReplayButton eventId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-serif text-xl text-bark-600 mb-3">Recent 50</h2>
        <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
          <table className="w-full font-sans text-sm">
            <thead className="bg-cream-100 text-bark-400 text-[10px] uppercase tracking-[0.2em]">
              <tr>
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Received</th>
                <th className="text-right px-4 py-3">Attempts</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-bark-400">No events yet.</td></tr>
              ) : recent.map(e => {
                const status = e.processed ? 'processed' : e.last_error ? 'failed' : 'in flight'
                const statusColor = e.processed ? 'bg-sage-100 text-sage-700' : e.last_error ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-gold-700'
                return (
                  <tr key={e.id} className="border-t border-cream-200">
                    <td className="px-4 py-3 font-mono text-[10px] text-bark-500">{e.id.slice(0, 24)}…</td>
                    <td className="px-4 py-3 text-bark-600">{e.type}</td>
                    <td className="px-4 py-3 text-bark-400 text-xs">{formatDate(e.received_at)}</td>
                    <td className="px-4 py-3 text-right text-bark-600">{e.attempts}</td>
                    <td className="px-4 py-3">
                      <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${statusColor}`}>{status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
