import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { resend } from '@/lib/resend'

// Vercel Cron — runs daily
// Add to vercel.json: "crons": [{ "path": "/api/cron/restock-alerts", "schedule": "0 9 * * *" }]

export async function GET(req: NextRequest) {
  // Verify it's called from Vercel Cron
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const boxes = await getBoxes({ activeOnly: true })
    const lowStockItems: Array<{ boxName: string; productName: string; quantity: number }> = []

    // Check each box's items for low stock
    for (const box of boxes) {
      for (const [_slotKey, product] of Object.entries(box.selection)) {
        if (!product) continue

        // Get stock for this product
        let quantity = 0
        const { data: variants } = await supabaseAdmin
          .from('product_variants')
          .select('quantity')
          .eq('product_id', product.id)

        // Sum variant stock if it has variants
        if (variants && variants.length > 0) {
          quantity = variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
        } else {
          // Check inventory table
          const { data: inv } = await supabaseAdmin
            .from('inventory')
            .select('quantity')
            .eq('product_id', product.id)
            .maybeSingle()
          quantity = inv?.quantity ?? 0
        }

        // Flag if below 5
        if (quantity < 5) {
          lowStockItems.push({
            boxName: box.name,
            productName: product.name,
            quantity,
          })
        }
      }
    }

    // Send email if there are low stock items
    if (lowStockItems.length > 0) {
      const emailHtml = `
        <h2>🚨 Low Stock Alert</h2>
        <p>The following items in your prebuilt boxes are running low:</p>
        <ul>
          ${lowStockItems.map(item => `
            <li>
              <strong>${item.productName}</strong> (${item.quantity} units) — used in: <em>${item.boxName}</em>
            </li>
          `).join('')}
        </ul>
        <p>Please restock these items to maintain your prebuilt box availability.</p>
        <a href="https://petitelavande.com/portal/products">Go to Products Portal</a>
      `

      await resend.emails.send({
        from: 'Petite Lavande <noreply@petitelavande.com>',
        to: process.env.ADMIN_EMAIL || 'emily@example.com',
        subject: `Low Stock Alert: ${lowStockItems.length} item(s)`,
        html: emailHtml,
      })
    }

    return NextResponse.json({ checked: boxes.length, lowStock: lowStockItems.length, ok: true })
  } catch (error) {
    console.error('Restock alert error:', error)
    return NextResponse.json({ error: 'Failed to check stock' }, { status: 500 })
  }
}
