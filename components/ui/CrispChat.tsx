'use client'

import { useEffect, useState } from 'react'

type CrispWindow = { $crisp?: unknown[][]; CRISP_WEBSITE_ID?: string }

// Crisp live chat with a BRANDED launcher: Crisp's own bubble (preset colours
// only — no custom hex on any plan) stays hidden, and we render our own soft
// beige button instead. Clicking it opens the Crisp chat window; while the
// window is open the launcher hides. A gold dot marks unread replies.
export function CrispChat({ websiteId }: { websiteId: string }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(false)

  useEffect(() => {
    const w = window as unknown as CrispWindow
    if (!w.$crisp) {
      w.$crisp = []
      w.CRISP_WEBSITE_ID = websiteId
      const s = document.createElement('script')
      s.src = 'https://client.crisp.chat/l.js'
      s.async = true
      document.head.appendChild(s)
    }
    const c = w.$crisp
    // Replace Crisp's default bubble with ours.
    c.push(['do', 'chat:hide'])
    c.push(['on', 'chat:opened', () => setChatOpen(true)])
    c.push(['on', 'chat:closed', () => {
      setChatOpen(false)
      ;(window as unknown as CrispWindow).$crisp?.push(['do', 'chat:hide'])
    }])
    c.push(['on', 'message:received', () => setUnread(true)])
  }, [websiteId])

  function openChat() {
    setUnread(false)
    const c = (window as unknown as CrispWindow).$crisp
    c?.push(['do', 'chat:show'])
    c?.push(['do', 'chat:open'])
  }

  if (chatOpen) return null

  return (
    <button
      type="button"
      onClick={openChat}
      aria-label="Chat with us"
      title="Chat with us"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full pl-round-full shadow-md flex items-center justify-center bg-[#E3D6C8] hover:bg-[#d9c9b8] transition-colors"
    >
      {/* White speech bubble with typing dots */}
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          d="M5.5 3.5h13A3 3 0 0 1 21.5 6.5v7a3 3 0 0 1-3 3h-6.2l-3.1 3.2a.6.6 0 0 1-1-.4v-2.8h-2.7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"
          fill="#fff"
        />
        <circle cx="8.4" cy="10" r="1.15" fill="#E3D6C8" />
        <circle cx="12" cy="10" r="1.15" fill="#E3D6C8" />
        <circle cx="15.6" cy="10" r="1.15" fill="#E3D6C8" />
      </svg>
      {unread && (
        <span className="absolute top-1 right-1 w-3 h-3 rounded-full pl-round-full bg-gold-500 border-2 border-white" aria-hidden="true" />
      )}
    </button>
  )
}
