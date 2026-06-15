import { supabaseAdmin } from './supabase'
import { FIRST_YEAR_PRODUCT } from './first-year'

// Admin reads/writes for The First Year sub-line. Server-only.

// ── Set product (editable name/price/description; overrides the code default) ──
export interface FirstYearProduct { id: string; name: string; description: string; priceCents: number }

export async function getFirstYearProduct(): Promise<FirstYearProduct> {
  try {
    const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', 'first_year.product').maybeSingle()
    const ov = (data?.value as Partial<FirstYearProduct> | undefined) ?? {}
    return {
      id: FIRST_YEAR_PRODUCT.id,
      name: ov.name?.trim() || FIRST_YEAR_PRODUCT.name,
      description: ov.description?.trim() || FIRST_YEAR_PRODUCT.description,
      priceCents: Number.isFinite(Number(ov.priceCents)) && Number(ov.priceCents) > 0 ? Number(ov.priceCents) : FIRST_YEAR_PRODUCT.priceCents,
    }
  } catch {
    return { ...FIRST_YEAR_PRODUCT }
  }
}

export async function saveFirstYearProduct(p: { name?: string; description?: string; priceCents?: number }): Promise<void> {
  await supabaseAdmin.from('site_content')
    .upsert({ key: 'first_year.product', value: p, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

export interface ShipmentRow {
  id: string
  order_id: string | null
  shipment_index: number | null
  label: string | null
  status: 'pending' | 'size_confirmed' | 'shipped'
  planned_size: string | null
  ship_by_date: string | null
  notice_sent_at: string | null
  recipient_email: string | null
  order: { customer_name: string | null; customer_email: string | null; recipient_name: string | null } | null
}

/** All scheduled shipments, soonest ship_by_date first. */
export async function getShipments(): Promise<ShipmentRow[]> {
  const { data } = await supabaseAdmin
    .from('scheduled_shipments')
    .select('id, order_id, shipment_index, label, status, planned_size, ship_by_date, notice_sent_at, recipient_email, order:orders(customer_name, customer_email, recipient_name)')
    .order('ship_by_date', { ascending: true })
  return (data ?? []) as unknown as ShipmentRow[]
}

export async function confirmShipmentSize(id: string, size: string): Promise<void> {
  await supabaseAdmin.from('scheduled_shipments')
    .update({ status: 'size_confirmed', planned_size: size.trim() || null }).eq('id', id)
}

export async function markShipmentShipped(id: string): Promise<void> {
  await supabaseAdmin.from('scheduled_shipments').update({ status: 'shipped' }).eq('id', id)
}

// ── 2-week advance notice (Task 6) ───────────────────────────────────────────
export interface DueShipment {
  id: string
  label: string | null
  recipient_email: string | null
  order: { customer_email: string | null; recipient_name: string | null } | null
}

/** Pending shipments (excluding Welcome/I) within 14 days that haven't been noticed. */
export async function getShipmentsDueForNotice(): Promise<DueShipment[]> {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 14)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const { data } = await supabaseAdmin
    .from('scheduled_shipments')
    .select('id, label, recipient_email, order:orders(customer_email, recipient_name)')
    .eq('status', 'pending').is('notice_sent_at', null)
    .neq('shipment_index', 1)               // Welcome ships at purchase — no notice
    .lte('ship_by_date', cutoffStr)
  return (data ?? []) as unknown as DueShipment[]
}

export async function markNoticeSent(id: string, token: string): Promise<void> {
  await supabaseAdmin.from('scheduled_shipments')
    .update({ notice_sent_at: new Date().toISOString(), confirm_token: token }).eq('id', id)
}

export interface TokenShipment {
  id: string; label: string | null; status: string; planned_size: string | null
  order: { recipient_name: string | null } | null
}

/** Look up a shipment by its login-free confirm token. */
export async function getShipmentByToken(token: string): Promise<TokenShipment | null> {
  const { data } = await supabaseAdmin
    .from('scheduled_shipments')
    .select('id, label, status, planned_size, order:orders(recipient_name)')
    .eq('confirm_token', token).maybeSingle()
  return (data as unknown as TokenShipment) ?? null
}

export async function confirmSizeByToken(token: string, size: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('scheduled_shipments')
    .update({ status: 'size_confirmed', planned_size: size.trim() || null })
    .eq('confirm_token', token).select('id').maybeSingle()
  return Boolean(data)
}
