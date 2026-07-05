'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// One-tap questions shown under the greeting until the visitor writes.
const INSTANT_ANSWERS = [
  'Track my order',
  'What materials are your products made from?',
  'How long does shipping take?',
  'Can I customize a box?',
]

// On-brand chat widget — beige "Chat with us" header, white body, instant-answer
// chips, AI-backed replies via /api/chat, and an email handoff for humans.
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Chat panel */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl pl-round-full shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '520px', maxHeight: 'calc(100vh - 7rem)', borderRadius: 18 }}>

          {/* Header — soft beige, greeting beneath the title */}
          <div className="bg-[#E3D6C8] px-5 pt-5 pb-6 shrink-0 relative">
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              className="absolute top-3.5 right-3.5 text-espresso/50 hover:text-espresso transition-colors">
              <X size={17} />
            </button>
            <p className="font-serif text-xl text-espresso mb-1.5">Chat with us</p>
            <p className="font-sans text-[13px] text-espresso/80 leading-relaxed">
              👋 Hi, message us with any questions. We&rsquo;re happy to help!
            </p>
          </div>

          {/* Messages + instant answers */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
            {messages.length === 0 && (
              <div>
                <p className="font-sans text-[12px] tracking-[0.06em] text-bark-400 text-center mb-3">Instant answers</p>
                <div className="space-y-2">
                  {INSTANT_ANSWERS.map(q => (
                    <button key={q} type="button" onClick={() => send(q)}
                      className="w-full text-left border border-cream-300 rounded-xl pl-round-full px-4 py-3 font-sans text-sm text-espresso hover:border-gold-400 hover:bg-cream-50 transition-colors"
                      style={{ borderRadius: 12 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 font-sans text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#E3D6C8] text-espresso rounded-2xl rounded-br-sm'
                    : 'bg-cream-100 text-bark-600 rounded-2xl rounded-bl-sm'
                }`} style={{ borderRadius: 14 }}>
                  {msg.content}
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

          {/* Human handoff */}
          <div className="px-4 py-2 border-t border-cream-200 bg-white shrink-0">
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
