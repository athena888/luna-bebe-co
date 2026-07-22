import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPendingCards } from '@/lib/cards-data'

// Portal → Cards: list every order still needing a pen-written gift card,
// in mat/slot batch order. POST marks the current writable set as generated
// (the portal twin of the CLI's --mark).

export async function GET() {
  const { cards, flagColumnMissing } = await getPendingCards()
  return NextResponse.json({ cards, flagColumnMissing })
}

export async function POST() {
  const { cards, flagColumnMissing } = await getPendingCards()
  if (flagColumnMissing) {
    return NextResponse.json(
      { error: 'The card_generated column is missing — run §36 of _RUN_ALL_PENDING.sql first.' },
      { status: 409 },
    )
  }
  const ids = cards.filter(c => !c.handwrite).map(c => c.id)
  if (ids.length === 0) return NextResponse.json({ marked: 0 })
  const { error } = await supabaseAdmin.from('orders').update({ card_generated: true }).in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ marked: ids.length })
}
