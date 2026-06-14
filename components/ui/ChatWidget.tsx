'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hi! I'm here to help with anything about Petite Lavande — products, shipping, orders, or gift ideas. What can I help you with?",
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
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

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
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
        <div className="w-[340px] bg-white border border-cream-300 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="bg-bark-600 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div>
              <p className="font-sans text-sm font-medium text-cream-100">Petite Lavande Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                <p className="font-sans text-[10px] text-cream-300">Online now</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-cream-300 hover:text-cream-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-cream-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 font-sans text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-bark-600 text-cream-50 rounded-2xl rounded-br-sm'
                    : 'bg-white border border-cream-300 text-bark-600 rounded-2xl rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-cream-300 px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Human handoff */}
          <div className="px-4 py-2 border-t border-cream-200 bg-white shrink-0">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-sans text-[10px] text-bark-400 hover:text-bark-600 transition-colors"
            >
              Prefer to talk to a person? Email us →
            </a>
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-cream-200 bg-white flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Ask anything…"
              className="flex-1 px-3 py-2 border border-cream-300 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors bg-cream-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-bark-600 text-cream-50 hover:bg-bark-700 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="pl-round-full bg-bark-600 text-cream-50 shadow-lg hover:bg-bark-700 transition-colors flex items-center justify-center"
        style={{ width: 52, height: 52 }}
        aria-label="Open chat"
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>

    </div>
  )
}
