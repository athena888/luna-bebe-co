'use client'

import { useState } from 'react'

export function NewsletterForm() {
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState('')

  if (done) {
    return <p className="font-sans text-sm text-bark-600">Thank you — you're on the list.</p>
  }

  return (
    <>
      <form
        className="flex border border-cream-300 bg-white"
        onSubmit={e => { e.preventDefault(); if (email) setDone(true) }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 px-4 py-3 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none bg-transparent"
        />
        <button type="submit" className="px-4 border-l border-cream-300 text-bark-400 hover:text-bark-600 transition-colors text-lg">
          →
        </button>
      </form>
      <p className="font-sans text-[9px] text-bark-400/50 mt-3 leading-relaxed">
        By subscribing you agree to receive occasional emails. Unsubscribe any time.
      </p>
    </>
  )
}
