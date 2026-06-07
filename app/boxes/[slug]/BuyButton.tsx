'use client'

import { useRouter } from 'next/navigation'
import type { Product } from '@/types'

export function BuyButton({ items }: { items: Product[] }) {
  const router = useRouter()

  function handleBuy() {
    sessionStorage.setItem('pl_box_selection', JSON.stringify(items))
    sessionStorage.removeItem('pl_letter')
    router.push('/checkout')
  }

  return (
    <button
      onClick={handleBuy}
      className="w-full bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase py-4 hover:bg-bark-700 transition-colors"
    >
      Buy This Box
    </button>
  )
}
