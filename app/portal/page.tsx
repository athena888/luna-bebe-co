import { supabaseAdmin } from '@/lib/supabase'
import { DollarSign, ShoppingBag, Clock, AlertCircle } from 'lucide-react'
import { RealtimeTraffic } from '@/components/portal/RealtimeTraffic'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

async function getStats() {
  const [ordersRes, issuesRes] = await Promise.all([
    supabaseAdmin.from('orders').select('total_amount, status'),
    supabaseAdmin.from('customer_issues').select('status'),
  ])

  const orders = ordersRes.data ?? []
  const issues = issuesRes.data ?? []

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length

  return { totalRevenue, totalOrders, pendingOrders, openIssues }
}

export default async function PortalDashboard() {
  const stats = await getStats()

  const CARDS = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: <DollarSign size={22} className="text-gold-400" />, bg: 'bg-gold-100/20' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), icon: <ShoppingBag size={22} className="text-sage-400" />, bg: 'bg-sage-100/20' },
    { label: 'Pending Orders', value: stats.pendingOrders.toString(), icon: <Clock size={22} className="text-bark-400" />, bg: 'bg-cream-200/40' },
    { label: 'Open Issues', value: stats.openIssues.toString(), icon: <AlertCircle size={22} className="text-rose-400" />, bg: 'bg-rose-100/20' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Dashboard</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Welcome back. Here&apos;s what&apos;s happening with Petite Lavande.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {CARDS.map(({ label, value, icon, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-cream-200 p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-bark-400">{label}</span>
              {icon}
            </div>
            <div className="font-serif text-3xl text-bark-600">{value}</div>
          </div>
        ))}
      </div>

      {/* Live traffic from Google Analytics */}
      <div className="mb-10">
        <RealtimeTraffic />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
          <h2 className="font-serif text-xl text-bark-600 mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { href: '/portal/orders', label: 'View all orders →' },
              { href: '/portal/outreach', label: 'Morning Review →' },
              { href: '/portal/lookbook/images', label: 'Lookbook →' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="block font-sans text-sm text-gold-500 hover:text-gold-600 transition-colors">{label}</a>
            ))}
          </div>
        </div>
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
          <h2 className="font-serif text-xl text-bark-600 mb-2">Customer Chat</h2>
          <p className="font-sans text-sm text-bark-400 leading-relaxed">
            Live chat is active on your site. Reply to customers from the <span className="font-medium text-bark-600">Crisp app</span> on your phone; the AI covers common questions when you&rsquo;re offline.
          </p>
        </div>
      </div>
    </div>
  )
}
