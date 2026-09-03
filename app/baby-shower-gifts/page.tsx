import type { Metadata } from 'next'
import { OccasionLanding, occasionMetadata } from '@/components/gifting/OccasionLanding'
import { getOccasion } from '@/lib/gifting'

// Meta ad landing page. Content, copy and product selection all live in
// lib/gifting.ts → OCCASIONS; this file exists to own the URL.
// force-dynamic: the page reads the live catalog and signed review data, and a
// stale ad landing page that shows a sold-out or renamed gift costs real spend.
export const dynamic = 'force-dynamic'

const OCCASION = getOccasion('baby_shower')!

export const metadata: Metadata = occasionMetadata(OCCASION)

export default function Page() {
  return <OccasionLanding occasion={OCCASION} />
}
