'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, ChevronLeft } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// One-tap questions on the options screen. "Track my order" opens the inline
// order lookup instead of asking the AI.
const INSTANT_ANSWERS = [
  'What materials are your products made from?',
  'How long does shipping take?',
  'Can I customize a box?',
]

const STATUS_LABEL: Record<string, string> = {
  pending: 'Order received', paid: 'Payment confirmed', assembling: 'Assembling your box', shipped: 'Shipped', delivered: 'Delivered',
}

// Render assistant text: paragraphs/newlines preserved, **bold** and bare URLs
// converted (the model occasionally emits markdown).
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g)
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="underline underline-offset-2">{p}</a>
    return <span key={i}>{p}</span>
  })
}

// On-brand chat widget — beige "Chat with us" header, options screen with
// instant answers + order lookup, AI-backed replies, email handoff.
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'menu' | 'chat' | 'track'>('menu')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [trackEmail, setTrackEmail] = useState('')
  const [trackRef, setTrackRef] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && view === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, view, messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setView('chat')

    const next = [...messages, { role: 'user', content } as Message]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? data.error ?? 'Something went wrong.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error. Please email ${CONTACT_EMAIL}` }])
    } finally {
      setLoading(false)
    }
  }

  // Inline order lookup — same API as the /track page; answers right in chat.
  async function lookupOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!trackEmail.trim() || loading) return
    setLoading(true)
    setView('chat')
    setMessages(prev => [...prev, { role: 'user', content: `Track my order (${trackEmail.trim()})` }])
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trackEmail.trim(), reference: trackRef.trim() }),
      })
      const data = await res.json()
      let reply: string
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        reply = data.orders.slice(0, 3).map((o: { id: string; status: string; tracking_url?: string | null }) => {
          const ref = `#${o.id.slice(-8).toUpperCase()}`
          const status = STATUS_LABEL[o.status] ?? o.status
          return `${ref}: ${status}${o.tracking_url ? `\nTrack the parcel: ${o.tracking_url}` : ''}`
        }).join('\n\n')
        reply += '\n\nFull details anytime at https://petitelavande.com/track'
      } else {
        reply = `I couldn't find an order under that email. Double-check it, or look it up directly at https://petitelavande.com/track — and we're at ${CONTACT_EMAIL} if you need a hand.`
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: `I couldn't check right now — please try https://petitelavande.com/track or email ${CONTACT_EMAIL}.` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">

      {/* Chat panel */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-2.5rem)] bg-white shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '430px', maxHeight: 'calc(100vh - 7rem)', borderRadius: 18 }}>

          {/* Header — soft beige, greeting beneath the title */}
          <div className="bg-[#E3D6C8] px-5 pt-4 pb-4 shrink-0 relative">
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              className="absolute top-3.5 right-3.5 text-espresso/50 hover:text-espresso transition-colors">
              <X size={17} />
            </button>
            <p className="font-serif text-xl text-espresso mb-1">Chat with us</p>
            <p className="font-sans text-[13px] text-espresso/80 leading-relaxed">
              👋 Hi, message us with any questions. We&rsquo;re happy to help!
            </p>
          </div>

          {/* Body */}
          {view === 'menu' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
              <p className="font-sans text-[12px] tracking-[0.06em] text-bark-400 text-center mb-3">Instant answers</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setView('track')}
                  className="w-full text-left border border-cream-300 px-4 py-3 font-sans text-sm text-espresso hover:border-gold-400 hover:bg-cream-50 transition-colors"
                  style={{ borderRadius: 12 }}>
                  Track my order
                </button>
                {INSTANT_ANSWERS.map(q => (
                  <button key={q} type="button" onClick={() => send(q)}
                    className="w-full text-left border border-cream-300 px-4 py-3 font-sans text-sm text-espresso hover:border-gold-400 hover:bg-cream-50 transition-colors"
                    style={{ borderRadius: 12 }}>
                    {q}
                  </button>
                ))}
                {messages.length > 0 && (
                  <button type="button" onClick={() => setView('chat')}
                    className="w-full text-center px-4 py-3 font-sans text-[12px] tracking-[0.08em] uppercase text-bark-400 hover:text-espresso transition-colors">
                    Back to chat →
                  </button>
                )}
              </div>
            </div>
          )}

          {view === 'track' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
              <button type="button" onClick={() => setView('menu')}
                className="flex items-center gap-1 font-sans text-[12px] text-bark-400 hover:text-espresso transition-colors mb-4">
                <ChevronLeft size={13} /> All options
              </button>
              <p className="font-sans text-sm text-espresso mb-3">Enter the email used on the order — I&rsquo;ll check its status right here.</p>
              <form onSubmit={lookupOrder} className="space-y-2.5">
                <input type="email" required value={trackEmail} onChange={e => setTrackEmail(e.target.value)} placeholder="you@email.com"
                  className="w-full px-4 py-2.5 border border-cream-300 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                  style={{ borderRadius: 12 }} />
                <input type="text" value={trackRef} onChange={e => setTrackRef(e.target.value)} placeholder="Order reference (optional)"
                  className="w-full px-4 py-2.5 border border-cream-300 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                  style={{ borderRadius: 12 }} />
                <button type="submit" disabled={loading}
                  className="w-full bg-[#7A8E7C] text-white font-sans text-[12px] tracking-[0.2em] uppercase py-3 hover:bg-[#6d8070] transition-colors disabled:opacity-40"
                  style={{ borderRadius: 12 }}>
                  {loading ? 'Checking…' : 'Check status'}
                </button>
              </form>
            </div>
          )}

          {view === 'chat' && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
              <button type="button" onClick={() => setView('menu')}
                className="flex items-center gap-1 font-sans text-[12px] text-bark-400 hover:text-espresso transition-colors">
                <ChevronLeft size={13} /> All options
              </button>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] px-3.5 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user' ? 'bg-[#E3D6C8] text-espresso' : 'bg-cream-100 text-bark-600'
                  }`} style={{ borderRadius: 14 }}>
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-cream-100 px-3.5 py-2.5 flex items-center gap-1.5" style={{ borderRadius: 14 }}>
                    <span className="w-1.5 h-1.5 bg-bark-400 rounded-full pl-round-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-bark-400 rounded-full pl-round-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-bark-400 rounded-full pl-round-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Human handoff */}
          <div className="px-4 py-1.5 border-t border-cream-200 bg-white shrink-0">
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-sans text-[11px] text-bark-400 hover:text-bark-600 transition-colors">
              Prefer a person? Email us →
            </a>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 bg-white flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Write message"
              className="flex-1 px-4 py-2.5 border border-cream-300 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors bg-white"
              style={{ borderRadius: 12 }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Send"
              className="px-3.5 text-espresso/70 hover:text-espresso transition-colors disabled:opacity-30"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Launcher — soft beige circle, white speech bubble */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        title="Chat with us"
        className="w-14 h-14 rounded-full pl-round-full shadow-md flex items-center justify-center bg-[#E3D6C8] hover:bg-[#d9c9b8] transition-colors"
      >
        {open ? (
          <X size={20} className="text-white" />
        ) : (
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              d="M5.5 3.5h13A3 3 0 0 1 21.5 6.5v7a3 3 0 0 1-3 3h-6.2l-3.1 3.2a.6.6 0 0 1-1-.4v-2.8h-2.7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"
              fill="#fff"
            />
            <circle cx="8.4" cy="10" r="1.15" fill="#E3D6C8" />
            <circle cx="12" cy="10" r="1.15" fill="#E3D6C8" />
            <circle cx="15.6" cy="10" r="1.15" fill="#E3D6C8" />
          </svg>
        )}
      </button>

    </div>
  )
}
