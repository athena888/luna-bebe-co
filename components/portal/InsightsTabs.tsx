import Link from 'next/link'

type TabId = 'channels' | 'stock' | 'economics'

// Tab switcher that unifies Analytics (sales/channels/scorecard), Stock
// Insights, and Unit Economics under one portal nav item. Plain component (no
// client hooks) so it works in both server and client pages.
export function InsightsTabs({ active }: { active: TabId }) {
  const Tab = ({ href, id, label }: { href: string; id: TabId; label: string }) => (
    <Link
      href={href}
      className={`px-4 py-2.5 font-sans text-sm transition-colors -mb-px border-b-2 ${
        active === id ? 'border-bark-600 text-bark-700 font-medium' : 'border-transparent text-bark-400 hover:text-bark-600'
      }`}
    >
      {label}
    </Link>
  )
  return (
    <div className="flex gap-1 mb-6 border-b border-cream-300">
      <Tab href="/portal/analytics" id="channels" label="Sales & Channels" />
      <Tab href="/portal/stock-insights" id="stock" label="Stock & Products" />
      <Tab href="/portal/economics" id="economics" label="Unit Economics" />
    </div>
  )
}
