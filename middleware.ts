import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AFFILIATE_COOKIE, AFFILIATE_COOKIE_DAYS } from '@/lib/affiliate'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Capture affiliate ref param on any page navigation
  const ref = searchParams.get('ref')
  const response = (() => {
    if (pathname.startsWith('/portal/login') || pathname.startsWith('/api/portal/auth')) {
      return NextResponse.next()
    }

    if (pathname.startsWith('/portal')) {
      const session = request.cookies.get('portal_session')?.value
      const expected = process.env.PORTAL_TOKEN

      if (!expected || session !== expected) {
        const loginUrl = new URL('/portal/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    return NextResponse.next()
  })()

  if (ref && /^[A-Z0-9-]{3,32}$/i.test(ref)) {
    response.cookies.set(AFFILIATE_COOKIE, ref.toUpperCase(), {
      maxAge: AFFILIATE_COOKIE_DAYS * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    })
    // Fire-and-forget click record (best-effort, no await — middleware must be fast)
    const trackUrl = new URL('/api/affiliate/track', request.url)
    fetch(trackUrl.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: ref.toUpperCase(),
        landing: pathname,
        referrer: request.headers.get('referer'),
        ua: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      }),
    }).catch(() => {})
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|icon-|apple-touch|api/affiliate/track).*)'],
}
