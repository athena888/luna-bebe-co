import { supabaseAdmin } from './supabase.ts'

// Order-confirmation emails show item thumbnails. Items stored on the order
// don't always carry an image URL, and the storage filenames have timestamp
// suffixes (so URLs can't be guessed from the id) — resolve any missing
// images from the products table at send time. Fail-soft: on any error the
// items go out as-is and the email simply skips those thumbnails.
export async function resolveOrderItemImages<T extends { id?: string; image?: string | null }>(items: T[]): Promise<T[]> {
  try {
    const missing = [...new Set(items.filter(i => !i.image && i.id).map(i => i.id!))]
    if (!missing.length) return items
    const { data } = await supabaseAdmin.from('products').select('id, image').in('id', missing)
    const byId = new Map((data ?? []).map(r => [r.id as string, (r.image as string | null) ?? null]))
    return items.map(i => (i.image || !i.id) ? i : { ...i, image: byId.get(i.id) ?? null })
  } catch {
    return items
  }
}
