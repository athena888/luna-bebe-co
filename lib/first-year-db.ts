import { supabaseAdmin } from './supabase'

// Admin reads/writes for The First Year scheduled shipments (Task 5). Server-only.

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
