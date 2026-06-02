import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that must stay public even though they sit under a protected prefix
const PUBLIC_EXCEPTIONS = [
  '/portal/login',
  '/api/portal/auth',
  '/api/orders/track',   // customers track their own order — must stay public
]

function isAuthed(request: NextRequest): boolean {
  const session = request.cookies.get('portal_session')?.value
  const expected = process.env.PORTAL_TOKEN
  return !!expected && session === expected
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_EXCEPTIONS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/')

  // Admin APIs: all /api/portal/* plus the admin order routes (list / ship / process)
  const isProtectedApi =
    pathname.startsWith('/api/portal/') ||
    pathname === '/api/orders' ||
    /^\/api\/orders\/[^/]+\/(ship|process)$/.test(pathname)

  if (isProtectedApi) {
    if (!isAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Portal UI pages: redirect to login when not authed
  if (pathname.startsWith('/portal')) {
    if (!isAuthed(request)) {
      const loginUrl = new URL('/portal/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Defensive: never let any other /api/* fall through this matcher unprotected
  if (isApi && !isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/portal/:path*', '/api/portal/:path*', '/api/orders/:path*'],
}
