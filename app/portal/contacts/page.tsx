import { supabaseAdmin } from '@/lib/supabase'
import { MarketingTabs } from '@/components/portal/MarketingTabs'

export const dynamic = 'force-dynamic'

// Portal → Contacts (Build 7) — the marketing list the machine feeds:
// counts by segment + opt-in, newest first. Read-only on purpose; capture
// happens only at the approved touchpoints (checkout, newsletter, forms).

type ContactRow = {
  id: string
  email: string
  name: string | null
  segment: string
  marketing_opt_in: boolean
  source: string
  created_at: string
}

const SEGMENT_LABELS: Record<string, string> = {
  parent_to_be: 'Parent-to-be',
  grandparent: 'Grandparent',
  friend_coworker: 'Friend / coworker',
  corporate: 'Corporate',
  unknown: 'Unknown',
}

const SEGMENT_STYLES: Record<string, string> = {
  parent_to_be: 'bg-sage-100 text-sage-500',
  grandparent: 'bg-gold-100 text-gold-600',
  friend_coworker: 'bg-purple-100 text-purple-700',
  corporate: 'bg-blue-100 text-blue-700',
  unknown: 'bg-cream-200 text-bark-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-cream-50 rounded-2xl border border-cream-200 px-5 py-4 min-w-[120px]">
      <p className="text-2xl text-bark-600">{value}</p>
      <p className="font-sans text-[11px] tracking-[0.08em] uppercase text-bark-400 mt-0.5">{label}</p>
    </div>
  )
}

export default async function ContactsPage() {
  const { data } = await supabaseAdmin
    .from('marketing_contacts')
    .select('id, email, name, segment, marketing_opt_in, source, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  const contacts = (data ?? []) as ContactRow[]

  const count = (fn: (c: ContactRow) => boolean) => contacts.filter(fn).length

  return (
    <div className="p-8">
      <MarketingTabs active="contacts" />
      <h1 className="text-2xl text-bark-600 mb-1">Contacts</h1>
      <p className="font-sans text-sm text-bark-400 mb-6">
        Your marketing list — captured only at checkout, newsletter signup, and forms. Opt-in gates every marketing send.
      </p>

      <div className="flex gap-3 flex-wrap mb-8">
        <Stat value={contacts.length} label="Total" />
        <Stat value={count(c => c.marketing_opt_in)} label="Opted in" />
        <Stat value={count(c => c.segment === 'parent_to_be')} label="Parents-to-be" />
        <Stat value={count(c => c.segment === 'grandparent')} label="Grandparents" />
        <Stat value={count(c => c.segment === 'friend_coworker')} label="Friends / coworkers" />
        <Stat value={count(c => c.segment === 'corporate')} label="Corporate" />
      </div>

      {contacts.length === 0 ? (
        <p className="font-sans text-sm text-bark-400">No contacts yet — they&rsquo;ll appear here as customers check out, subscribe, or save an occasion.</p>
      ) : (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 overflow-x-auto">
          <table className="w-full font-sans text-[13px]">
            <thead>
              <tr className="border-b border-cream-200 text-left">
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Email</th>
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Name</th>
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Segment</th>
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Opt-in</th>
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Source</th>
                <th className="px-4 py-3 text-[10.5px] tracking-[0.1em] uppercase text-bark-400 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-cream-200/60 last:border-0">
                  <td className="px-4 py-2.5 text-bark-600">{c.email}</td>
                  <td className="px-4 py-2.5 text-bark-500">{c.name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-[10px] tracking-[0.06em] uppercase font-semibold px-2 py-0.5 rounded-full ${SEGMENT_STYLES[c.segment] ?? SEGMENT_STYLES.unknown}`}>
                      {SEGMENT_LABELS[c.segment] ?? c.segment}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 font-semibold ${c.marketing_opt_in ? 'text-sage-500' : 'text-bark-300'}`}>{c.marketing_opt_in ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2.5 text-bark-400">{c.source}</td>
                  <td className="px-4 py-2.5 text-bark-400">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
