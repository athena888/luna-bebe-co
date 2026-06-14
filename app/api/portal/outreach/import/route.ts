import { NextRequest, NextResponse } from 'next/server'
import { bulkImportOutreachContacts, type ImportRecord } from '@/lib/outreach'

export const dynamic = 'force-dynamic'

// Quote-aware CSV parser (handles commas/quotes inside "double-quoted" fields).
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// POST { csv: string }. Maps header columns by name (email required; name,
// company, track, first_name optional). Returns inserted/duplicates/invalid.
export async function POST(req: NextRequest) {
  try {
    const { csv } = (await req.json()) as { csv?: string }
    if (!csv?.trim()) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

    const rows = parseCsv(csv)
    if (rows.length < 2) return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 })

    const header = rows[0].map(h => h.trim().toLowerCase())
    const col = (name: string) => header.indexOf(name)
    const iEmail = col('email')
    if (iEmail === -1) return NextResponse.json({ error: 'CSV must have an "email" column' }, { status: 400 })
    const iName = col('name'), iCompany = col('company'), iTrack = col('track'), iFirst = col('first_name')

    const records: ImportRecord[] = rows.slice(1).map(r => ({
      email: r[iEmail] ?? '',
      name: iName >= 0 ? r[iName] : null,
      company: iCompany >= 0 ? r[iCompany] : null,
      track: iTrack >= 0 ? r[iTrack] : null,
      first_name: iFirst >= 0 ? r[iFirst] : null,
    }))

    const result = await bulkImportOutreachContacts(records)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('outreach import error:', e)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
