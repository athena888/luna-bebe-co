import { supabaseAdmin } from '@/lib/supabase'
import type { CustomerIssue } from '@/types'
import { IssueActions } from './IssueActions'

function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-rose-100 text-rose-600',
  in_progress: 'bg-gold-100 text-gold-600',
  resolved: 'bg-sage-100 text-sage-600',
}

export default async function IssuesPage() {
  const { data: issues } = await supabaseAdmin
    .from('customer_issues')
    .select('*')
    .order('created_at', { ascending: false })

  const typedIssues = (issues ?? []) as CustomerIssue[]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Phone Issues</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">{typedIssues.length} total issues logged from phone calls</p>
      </div>

      <div className="space-y-4">
        {typedIssues.length === 0 && (
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center">
            <p className="font-sans text-sm text-bark-400">No phone issues logged yet.</p>
          </div>
        )}
        {typedIssues.map((issue) => (
          <div key={issue.id} className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block px-2.5 py-1 rounded-full font-sans text-xs font-semibold ${STATUS_STYLES[issue.status] ?? 'bg-cream-200 text-bark-500'}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  {issue.caller_phone && (
                    <span className="font-sans text-xs text-bark-400">📞 {issue.caller_phone}</span>
                  )}
                  <span className="font-sans text-xs text-bark-400">{formatDate(issue.created_at)}</span>
                </div>
                <p className="font-sans text-sm font-medium text-bark-600 mb-1">{issue.issue_summary}</p>
                {issue.order_id && (
                  <p className="font-sans text-xs text-bark-400">Order: <span className="font-mono">{issue.order_id}</span></p>
                )}
                {issue.full_transcript && (
                  <details className="mt-3">
                    <summary className="font-sans text-xs text-gold-500 cursor-pointer hover:text-gold-600 transition-colors">View full transcript</summary>
                    <div className="mt-2 p-3 bg-cream-100 rounded-xl border border-cream-200">
                      <p className="font-sans text-xs text-bark-500 leading-relaxed whitespace-pre-wrap">{issue.full_transcript}</p>
                    </div>
                  </details>
                )}
              </div>
              <IssueActions issueId={issue.id} currentStatus={issue.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
