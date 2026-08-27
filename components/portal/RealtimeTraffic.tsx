'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Users, Eye, Loader } from 'lucide-react'

interface Snapshot {
  configured: boolean
  /** false = credentials present but the property can't be read (see `hint`). */
  connected?: boolean
  reason?: 'permission' | 'property' | 'unknown'
  hint?: string
  activeUsers?: number
  todayUsers?: number
  todayPageViews?: number
  topPages?: Array<{ path: string; views: number }>
  funnel?: { view_item: number; add_to_cart: number; begin_checkout: number; purchase: number }
  error?: string
}

export function RealtimeTraffic() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/ga-realtime', { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setData({ configured: true, connected: false, reason: 'unknown', hint: 'Could not reach analytics.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Only poll while it's actually working. Re-polling a property we can't
    // read just burns a Google round-trip every 30s for as long as the tab
    // stays open — the setup card below tells you what to fix instead.
    if (data && (data.configured === false || data.connected === false)) return
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load, data])

  if (loading) {
    return (
      <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 flex items-center gap-3">
        <Loader size={16} className="animate-spin text-bark-400" />
        <span className="font-sans text-sm text-bark-400">Loading live traffic…</span>
      </div>
    )
  }

  // Not set up yet — show a gentle hint instead of an error
  if (data && data.configured === false) {
    return (
      <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
        <h2 className="font-serif text-xl text-bark-600 mb-2">Live Traffic</h2>
        <p className="font-sans text-sm text-bark-400 leading-relaxed">
          Connect Google Analytics to see live visitors here. Add the{' '}
          <code className="bg-cream-200 px-1 rounded text-xs">GA_PROPERTY_ID</code> and{' '}
          <code className="bg-cream-200 px-1 rounded text-xs">GA_SERVICE_ACCOUNT_JSON</code> environment variables in Vercel.
        </p>
      </div>
    )
  }

  // Credentials are set but the property can't be read — say exactly what to
  // fix rather than "setup is in progress", which never told anyone anything.
  if (data && data.connected === false) {
    return (
      <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-serif text-xl text-bark-600">Live Traffic</h2>
          <span className="font-sans text-[10px] uppercase tracking-wider text-bark-400 border border-cream-300 rounded px-1.5 py-0.5">Not connected</span>
        </div>
        <p className="font-sans text-sm text-bark-500 leading-relaxed mb-4">{data.hint}</p>
        <div className="flex flex-wrap gap-2">
          {data.reason === 'permission' && (
            <a
              href="https://analytics.google.com/analytics/web/#/admin/suiteusermanagement/property"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 border border-cream-300 text-bark-600 font-sans text-[11px] tracking-[0.11em] uppercase rounded hover:border-bark-400 transition-colors"
            >
              Property access management
            </a>
          )}
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.11em] uppercase rounded hover:bg-bark-700 transition-colors"
          >
            → View in Google Analytics
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl text-bark-600">Live Traffic</h2>
        <span className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wider text-sage-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-500" />
          </span>
          Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <Stat icon={<Activity size={18} className="text-gold-400" />} label="Active now" value={data?.activeUsers ?? 0} />
        <Stat icon={<Users size={18} className="text-sage-400" />} label="Users today" value={data?.todayUsers ?? 0} />
        <Stat icon={<Eye size={18} className="text-bark-400" />} label="Views today" value={data?.todayPageViews ?? 0} />
      </div>

      {/* Today's funnel. Shown even at zero: "12 viewed, 0 added" is the most
          useful sentence this card can say, and hiding it would read as broken
          rather than as an honest zero. */}
      {data?.funnel && (
        <div className="mb-5">
          <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-bark-400 mb-2">Today&apos;s funnel</p>
          <div className="grid grid-cols-4 gap-2">
            {([
              ['Viewed', data.funnel.view_item],
              ['Added', data.funnel.add_to_cart],
              ['Checkout', data.funnel.begin_checkout],
              ['Bought', data.funnel.purchase],
            ] as const).map(([label, n]) => (
              <div key={label} className="bg-white rounded-lg border border-cream-200 px-3 py-2 text-center">
                <p className="font-serif text-xl text-bark-600">{n}</p>
                <p className="font-sans text-[9px] tracking-[0.12em] uppercase text-bark-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="font-sans text-[10px] text-bark-300 mt-2">
            Counts exclude your own browsing — the portal flags this browser as internal.
          </p>
        </div>
      )}

      {!!data?.topPages?.length && (
        <div>
          <p className="font-sans text-[10px] uppercase tracking-wider text-bark-400 mb-2">Top pages today</p>
          <ul className="space-y-1.5">
            {data.topPages.map(p => (
              <li key={p.path} className="flex items-center justify-between font-sans text-xs">
                <span className="text-bark-600 truncate pr-3">{p.path}</span>
                <span className="text-bark-400 shrink-0">{p.views}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-sans text-[10px] text-bark-400/60 mt-4">Active = unique visitors in the last 30 minutes. Refreshes every 30s.</p>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <div className="font-serif text-2xl text-bark-600">{value}</div>
      <div className="font-sans text-[10px] uppercase tracking-wider text-bark-400 mt-0.5">{label}</div>
    </div>
  )
}
