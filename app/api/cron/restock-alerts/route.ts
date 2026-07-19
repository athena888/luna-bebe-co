import { NextRequest, NextResponse } from 'next/server'
import { computeReorderStatus } from '@/lib/reorder'
import { resend } from '@/lib/resend'
import { CONTACT_EMAIL } from '@/lib/site-config'

// Vercel Cron — runs daily (vercel.json: /api/cron/restock-alerts at 09:00 UTC).
// Flags every active product at or below its reorder point
// (daily_rate × lead_time_days + safety_stock; knobs on the inventory row)
// and emails the list. Emails only when something is flagged.

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await computeReorderStatus()
    const low = rows.filter(r => r.low).sort((a, b) => (a.weeksOnHand ?? Infinity) - (b.weeksOnHand ?? Infinity))

    if (low.length > 0) {
      const emailHtml = `
        <h2>🚨 Restock Alert — ${low.length} item(s) at or below reorder point</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">
          <tr style="text-align:left;border-bottom:1px solid #ddd;">
            <th>Product</th><th>On hand</th><th>Reorder point</th><th>Daily rate</th><th>Weeks left</th>
          </tr>
          ${low.map(r => `
            <tr style="border-bottom:1px solid #eee;">
              <td><strong>${r.name}</strong></td>
              <td>${r.onHand}</td>
              <td>${r.reorderPoint} (lead ${r.leadTimeDays}d + safety ${r.safetyStock})</td>
              <td>${r.dailyRate.toFixed(2)}/day</td>
              <td>${r.weeksOnHand != null ? r.weeksOnHand.toFixed(1) : '—'}</td>
            </tr>
          `).join('')}
        </table>
        <p style="font-family:sans-serif;font-size:13px;">
          Adjust lead time / safety stock on each product's page (Portal → Products).
          The Buy Sheet under Stock Insights has color/size splits.
        </p>
        <a href="https://petitelavande.com/portal/stock-insights">Open Stock Insights</a>
      `
      await resend.emails.send({
        from: `Petite Lavande <${CONTACT_EMAIL}>`,
        to: process.env.ADMIN_EMAIL || CONTACT_EMAIL,
        subject: `Restock alert: ${low.length} item(s) at reorder point`,
        html: emailHtml,
      })
    }

    return NextResponse.json({ checked: rows.length, lowStock: low.length, ok: true })
  } catch (error) {
    console.error('Restock alert error:', error)
    return NextResponse.json({ error: 'Failed to check stock' }, { status: 500 })
  }
}
