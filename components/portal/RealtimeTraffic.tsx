'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Users, Eye, Loader } from 'lucide-react'

interface Snapshot {
  configured: boolean
  activeUsers?: number
  todayUsers?: number
  todayPageViews?: number
  topPages?: Array<{ path: string; views: number }>
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
      setData({ configured: true, error: 'Could not reach analytics.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000) // refresh every 30s
    return () => clearInterval(id)
  }, [load])

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

  if (data?.error) {
    return (
      <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
        <h2 className="font-serif text-xl text-bark-600 mb-2">Live Traffic</h2>
        <p className="font-sans text-sm text-red-500">{data.error}</p>
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
