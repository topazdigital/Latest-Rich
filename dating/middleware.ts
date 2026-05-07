import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes require admin role
    if (pathname.startsWith('/admin')) {
      if (!token || (token as any).role !== 'admin') {
        return NextResponse.redirect(new URL('/home', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/forgot-password') ||
          pathname.startsWith('/terms') ||
          pathname.startsWith('/privacy') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/payments/payhero/callback') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/images') ||
          pathname.startsWith('/icons') ||
          pathname.startsWith('/uploads') ||
          pathname === '/favicon.ico' ||
          pathname === '/manifest.json'
        ) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)'],
}
