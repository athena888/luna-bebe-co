import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="font-script text-9xl text-gold-200 mb-2 leading-none">404</p>
          <h1 className="font-serif text-3xl text-bark-600 mb-4">Page not found</h1>
          <p className="font-sans text-sm text-bark-400 mb-10 leading-relaxed">
            This page seems to have wandered off. Let&apos;s take you somewhere beautiful instead.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/"><Button variant="outline" size="md">Back to Home</Button></Link>
            <Link href="/build"><Button variant="gold" size="md">Build a Box</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
