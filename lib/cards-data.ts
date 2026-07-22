import { supabaseAdmin } from './supabase'
import { CFG, hasUnrenderable } from '@/scripts/generate-cards'

// Orders in PROCESSING that still need a pen-written gift card, in the exact
// order the
// generator batches them onto mats — a card leaves the queue when its order
// ships (fulfilled) or when a batch is marked done. Fail-soft when §36
// (card_generated) isn't run yet.

export interface PendingCard {
  id: string
  recipient: string
  message: string
  created_at: string
  handwrite: boolean          // CJK etc. — the pen font can't write it
  mat: number | null          // null for handwrite rows
  slot: number | null
  row: number | null
  col: number | null
}

export async function getPendingCards(): Promise<{ cards: PendingCard[]; flagColumnMissing: boolean }> {
  let rows: Array<{ id: string; recipient_name: string | null; letter_content: string | null; created_at: string }> = []
  let flagColumnMissing = false
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, recipient_name, letter_content, created_at')
      .eq('status', 'processing')
      .or('card_generated.is.null,card_generated.eq.false')
      .not('letter_content', 'is', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    rows = data ?? []
  } catch {
    flagColumnMissing = true
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id, recipient_name, letter_content, created_at')
      .eq('status', 'processing')
      .not('letter_content', 'is', null)
      .order('created_at', { ascending: true })
    rows = data ?? []
  }

  const withMessage = rows.filter(r => (r.letter_content ?? '').trim())
  const perMat = CFG.cols * CFG.rows

  // Mirror the CLI: unwritable (CJK) messages are excluded from mats and
  // listed for handwriting; writable ones take mat slots sequentially.
  const cards: PendingCard[] = []
  let w = 0
  for (const r of withMessage) {
    const recipient = r.recipient_name ?? ''
    const message = (r.letter_content ?? '').trim()
    const full = (recipient ? `Dear ${recipient}, ` : '') + message
    const bad = hasUnrenderable(full)
    const handwrite = !!(bad && /[⺀-鿿぀-ヿ가-힯]/.test(full))
    if (handwrite) {
      cards.push({ id: r.id, recipient, message, created_at: r.created_at, handwrite, mat: null, slot: null, row: null, col: null })
    } else {
      cards.push({
        id: r.id, recipient, message, created_at: r.created_at, handwrite,
        mat: Math.floor(w / perMat) + 1,
        slot: (w % perMat) + 1,
        row: Math.floor((w % perMat) / CFG.cols) + 1,
        col: (w % perMat) % CFG.cols + 1,
      })
      w++
    }
  }
  return { cards, flagColumnMissing }
}
