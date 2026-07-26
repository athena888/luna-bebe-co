'use client'

import { useState } from 'react'

// One-tap thank-you back to the giver + a genuinely optional opt-in.
export function NoteActions({ token, senderName }: { token: string; senderName: string }) {
  const [thanks, setThanks] = useState<'idle' | 'sending' | 'done'>('idle')
  const [optin, setOptin] = useState<'idle' | 'form' | 'saving' | 'done'>('idle')
  const [email, setEmail] = useState('')

  async function sendThanks() {
    if (thanks !== 'idle') return
    setThanks('sending')
    try {
      await fetch('/api/gift-note/thanks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
    } finally {
      setThanks('done')
    }
  }

  async function saveOptin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || optin === 'saving') return
    setOptin('saving')
    try {
      await fetch('/api/gift-note/optin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email }),
      })
    } finally {
      setOptin('done')
    }
  }

  return (
    <div>
      <div className="flex gap-3 justify-center flex-wrap mb-4">
        <button onClick={sendThanks} disabled={thanks !== 'idle'}
          className="bg-white text-[#5a3e28] border border-[#d8cdbb] font-sans text-[11px] tracking-[0.18em] uppercase py-3.5 px-7 hover:bg-cream-100 transition-colors disabled:opacity-60">
          {thanks === 'done' ? 'Thank-you sent ♥' : thanks === 'sending' ? 'Sending…' : 'Send a Thank-You Back ♥'}
        </button>
        {optin === 'idle' && (
          <button onClick={() => setOptin('form')}
            className="bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.18em] uppercase py-3.5 px-7 hover:bg-[#6b7d6d] transition-colors">
            Hear From Us
          </button>
        )}
      </div>
      {(optin === 'form' || optin === 'saving') && (
        <form onSubmit={saveOptin} className="flex gap-2 max-w-xs mx-auto">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
            className="flex-1 min-w-0 px-3 py-2.5 font-sans text-[13px] text-espresso bg-white border border-[#d8cdbb] focus:outline-none" />
          <button type="submit" disabled={optin === 'saving'}
            className="px-4 bg-[#7A8E7C] text-white font-sans text-[10px] tracking-[0.15em] uppercase font-semibold disabled:opacity-50">
            Join
          </button>
        </form>
      )}
      {optin === 'done' && <p className="font-sans text-[12px] text-espresso-light">Lovely — you&rsquo;re on the list.</p>}
      <p className="font-sans text-[11px] text-[#9c7c5a] mt-4">
        The thank-you goes to {senderName} by email, one tap. Joining our list is genuinely optional.
      </p>
    </div>
  )
}
