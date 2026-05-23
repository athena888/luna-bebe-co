import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
}

export const config = {
  matcher: ['/portal/:path*'],
}
