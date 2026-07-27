import Link from 'next/link'

type TabId = 'contacts' | 'campaigns'

// Unifies the marketing list and campaign composer under one portal nav
// item. Same pattern as InsightsTabs — plain component, server-safe.
export function MarketingTabs({ active }: { active: TabId }) {
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
      <Tab href="/portal/contacts" id="contacts" label="Contacts" />
      <Tab href="/portal/campaigns" id="campaigns" label="Campaigns" />
    </div>
  )
}
