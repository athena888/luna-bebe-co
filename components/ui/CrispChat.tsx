'use client'

import { useEffect } from 'react'

// Crisp live chat loader. Injects Crisp's script in the browser (most reliable
// across Next versions) so you can reply to customers from the Crisp phone/
// desktop app. Renders nothing itself — Crisp draws its own bubble. The Website
// ID is public (exposed client-side by design).
export function CrispChat({ websiteId }: { websiteId: string }) {
  useEffect(() => {
    const w = window as unknown as { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string }
    if (w.$crisp) return // already loaded
    w.$crisp = []
    w.CRISP_WEBSITE_ID = websiteId
    const s = document.createElement('script')
    s.src = 'https://client.crisp.chat/l.js'
    s.async = true
    document.head.appendChild(s)
  }, [websiteId])
  return null
}
