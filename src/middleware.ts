import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isCheckout = req.nextUrl.pathname.startsWith('/checkout')
  const isAuthenticated = !!req.auth

  if ((isAdminRoute || isCheckout) && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
})

export const config = {
  matcher: ['/admin/:path*', '/checkout/:path*', '/api/trpc/:path*'],
}
