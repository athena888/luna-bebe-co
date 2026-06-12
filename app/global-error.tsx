'use client'

import { useEffect } from 'react'
import { CONTACT_EMAIL } from '@/lib/site-config'

// Catches errors thrown in the root layout itself. Must be fully self-contained
// (its own <html>/<body>) because the normal layout has failed to render.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#faf7f2', color: '#574540' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '12px' }}>Something went wrong</h1>
            <p style={{ fontSize: '14px', color: '#9a8c85', marginBottom: '28px', lineHeight: 1.6 }}>
              A little hiccup on our end. Please try again — if it keeps happening, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#c9a96a' }}>{CONTACT_EMAIL}</a>.
            </p>
            <button
              onClick={reset}
              style={{ background: '#c9a96a', color: '#fff', border: 0, padding: '12px 28px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '11px', cursor: 'pointer' }}
            >
              Try again
            </button>
            {error.digest && <p style={{ fontSize: '10px', color: '#c4b8b0', marginTop: '32px' }}>Reference: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  )
}
