'use client'

import React, { useState } from 'react'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { ShipButton } from './ShipButton'
import type { Order } from '@/types'
import Image from 'next/image'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gold-100 text-gold-600',
  processing: 'bg-blue-100 text-blue-600',
  shipped: 'bg-sage-100 text-sage-600',
  delivered: 'bg-green-100 text-green-600',
  cancelled: 'bg-red-100 text-red-500',
}

interface ExtendedOrder extends Order {
  preferred_assembly_image?: string | null
  preferred_assembly_style?: string | null
}

export function OrdersTable({ orders: initial }: { orders: ExtendedOrder[] }) {
  const [orders, setOrders] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)

  function handleShipped(orderId: string, trackingNumber: string, labelUrl: string) {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, status: 'shipped', tracking_number: trackingNumber, shippo_label_url: labelUrl }
          : o
      )
    )
  }

  function toggleExpand(orderId: string) {
    setExpanded(prev => prev === orderId ? null : orderId)
  }

  return (
    <div className="bg-cream-50 rounded-2xl border border-cream-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-100">
              {['', 'Order ID', 'Customer', 'Recipient', 'Items', 'Total', 'Shipping', 'Status', 'Tracking', 'Date', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wider text-bark-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-12 text-center font-sans text-sm text-bark-400">No orders yet.</td></tr>
            )}
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr
                  className="border-b border-cream-200 hover:bg-cream-100 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  {/* Expand toggle */}
                  <td className="px-3 py-3">
                    <ChevronDown
                      size={14}
                      className={`text-bark-400 transition-transform duration-200 ${expanded === order.id ? 'rotate-180' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-bark-400 font-mono">{order.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <p className="font-sans text-sm font-medium text-bark-600">{order.customer_name}</p>
                    <p className="font-sans text-xs text-bark-400">{order.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-bark-600">{order.recipient_name || '—'}</td>
                  <td className="px-4 py-3 font-sans text-xs text-bark-400">{order.selected_items?.length ?? 0} items</td>
                  <td className="px-4 py-3 font-sans text-sm font-semibold text-bark-600">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3 font-sans text-xs text-bark-400 capitalize">{order.shipping_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full font-sans text-xs font-semibold capitalize ${STATUS_STYLES[order.status] ?? 'bg-cream-200 text-bark-500'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {order.tracking_number ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-xs text-bark-400 font-mono">{order.tracking_number}</span>
                        {order.tracking_url && (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-500">
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {order.shippo_label_url && (
                          <a href={order.shippo_label_url} target="_blank" rel="noopener noreferrer" className="font-sans text-[10px] text-sage-500 underline">label</a>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-bark-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {order.status === 'processing' && (
                      <ShipButton
                        orderId={order.id}
                        onShipped={(trackingNumber, labelUrl) => handleShipped(order.id, trackingNumber, labelUrl)}
                      />
                    )}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === order.id && (
                  <tr className="border-b border-cream-200 bg-cream-50">
                    <td colSpan={11} className="px-6 py-6">
                      <div className="flex gap-8 items-start">

                        {/* Items list */}
                        <div className="flex-1">
                          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3">Items Ordered</p>
                          <div className="space-y-2">
                            {(order.selected_items ?? []).map((item, i) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-cream-200 last:border-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{item.imageEmoji}</span>
                                  <div>
                                    <p className="font-sans text-sm text-bark-600">{item.name}</p>
                                    <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{item.category}</p>
                                  </div>
                                </div>
                                <span className="font-sans text-sm text-bark-500">{formatPrice(item.price)}</span>
                              </div>
                            ))}
                          </div>
                          {order.letter_content && (
                            <div className="mt-4 p-3 bg-cream-100 border border-cream-300">
                              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">Handwritten Letter</p>
                              <p className="font-sans text-xs text-bark-500 leading-relaxed line-clamp-3">{order.letter_content}</p>
                            </div>
                          )}
                          {order.shipping_address && (
                            <div className="mt-4">
                              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">Ship To</p>
                              <p className="font-sans text-xs text-bark-500">
                                {(order.shipping_address as any).line1}{(order.shipping_address as any).line2 ? `, ${(order.shipping_address as any).line2}` : ''}<br />
                                {(order.shipping_address as any).city}, {(order.shipping_address as any).state} {(order.shipping_address as any).zip}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Assembly style preference */}
                        {order.preferred_assembly_image && (
                          <div className="shrink-0 w-52">
                            <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3">
                              Customer's Assembly Preference
                            </p>
                            <div className="relative w-52 aspect-square overflow-hidden border border-gold-300">
                              <Image
                                src={order.preferred_assembly_image}
                                alt="Assembly preference"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            {order.preferred_assembly_style && (
                              <p className="font-sans text-[10px] text-bark-400 mt-1.5 text-center">
                                Style: <span className="text-bark-600">{order.preferred_assembly_style}</span>
                              </p>
                            )}
                            <p className="font-sans text-[9px] text-bark-400/60 text-center mt-1">Assemble to match this arrangement</p>
                          </div>
                        )}

                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
