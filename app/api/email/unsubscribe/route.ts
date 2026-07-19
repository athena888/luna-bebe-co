import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'

// One-click unsubscribe from customer flow emails (linked in every flow email
// footer). Signed link — see lib/unsubscribe.ts.
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('e') || '').trim().toLowerCase()
  const token = req.nextUrl.searchParams.get('t') || ''

  const page = (title: string, body: string, status = 200) => new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="font-family:Georgia,serif;background:#faf7f2;color:#3d2c1e;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
       <div style="max-width:420px;text-align:center;">
         <p style="font-family:sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:0 0 16px;">Petite Lavande</p>
         <h1 style="font-size:24px;font-weight:normal;margin:0 0 12px;">${title}</h1>
         <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0;">${body}</p>
       </div>
     </body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return page('Something went wrong', 'This unsubscribe link is invalid or expired. Reply to any of our emails and we’ll take care of it for you.', 400)
  }

  const { error } = await supabaseAdmin
    .from('email_optouts')
    .upsert({ email, source: 'link' }, { onConflict: 'email' })

  if (error) {
    console.error('Unsubscribe upsert error:', error)
    return page('Something went wrong', 'We couldn’t process that just now. Reply to any of our emails and we’ll unsubscribe you by hand.', 500)
  }

  return page('You’re unsubscribed', 'You won’t receive any more marketing emails from us. Order and shipping confirmations still arrive as usual.')
}
