'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { getAllProducts } from '@/lib/products'
import { getWishlist, toggleWishlist } from '@/lib/wishlist'
import { Heart } from 'lucide-react'
import type { Product } from '@/types'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    const ids = getWishlist()
    const all = getAllProducts()
    setItems(all.filter(p => ids.includes(p.id)))
  }, [])

  function remove(id: string) {
    toggleWishlist(id)
    setItems(prev => prev.filter(p => p.id !== id))
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        <div className="border-b border-cream-300 px-6 py-12 text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Saved Items</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600">Your Wishlist</h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-14">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <Heart size={32} className="text-cream-300 mx-auto mb-4" />
              <p className="font-serif text-2xl text-bark-400 mb-2">Nothing saved yet</p>
              <p className="font-sans text-sm text-bark-400 mb-8">Tap the heart on any product while building your box to save it here.</p>
              <Link href="/build"><Button variant="gold" size="md">Build a Box</Button></Link>
            </div>
          ) : (
            <>
              <p className="font-sans text-xs text-bark-400 mb-8">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {items.map(item => (
                  <div key={item.id} className="bg-white border border-cream-200">
                    <div className="aspect-square bg-cream-100 flex items-center justify-center">
                      <span className="text-5xl">{item.imageEmoji}</span>
                    </div>
                    <div className="p-4">
                      <p className="font-sans text-xs font-medium text-bark-600 leading-snug mb-1">{item.name}</p>
                      <p className="font-sans text-xs text-bark-400 mb-3">{formatPrice(item.price)}</p>
                      <div className="flex gap-2">
                        <Link href="/build" className="flex-1">
                          <Button variant="gold" size="sm" className="w-full text-[9px]">Add to Box</Button>
                        </Link>
                        <button
                          onClick={() => remove(item.id)}
                          className="p-2 text-bark-400 hover:text-red-400 transition-colors"
                          title="Remove from wishlist"
                        >
                          <Heart size={14} className="fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link href="/build"><Button variant="outline" size="md">Continue Building</Button></Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
