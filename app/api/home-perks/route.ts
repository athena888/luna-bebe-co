import { NextResponse } from 'next/server'
import { getHomeContent } from '@/lib/home-content'

// Public: the promise-ticker items for the header strip (all pages).
export const revalidate = 300

export async function GET() {
  const content = await getHomeContent()
  return NextResponse.json({ perks: content.perks })
}
