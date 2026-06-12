import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 跳过 API 路由
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 尝试从 NextAuth 获取 token
  let token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // 如果没有 NextAuth token，尝试使用自定义的 user-id cookie
  if (!token) {
    const userIdCookie = request.cookies.get('user-id')
    if (userIdCookie) {
      console.log('[Middleware] Found user-id cookie:', userIdCookie.value)
      try {
        const user = await prisma.user.findUnique({
          where: { id: userIdCookie.value },
        })
        if (user) {
          console.log('[Middleware] User found from cookie:', user.email)
          token = {
            userId: user.id,
            email: user.email,
            englishLevel: user.englishLevel,
          }
        }
      } catch (error) {
        console.error('[Middleware] Error fetching user from cookie:', error)
      }
    }
  }

  const protectedPaths = ['/onboarding', '/dashboard', '/diary', '/write']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    if (!token) {
      console.log('[Middleware] No token found, redirecting to login')
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname === '/onboarding' && token.englishLevel !== 'beginner') {
      console.log('[Middleware] User has level, redirecting to dashboard')
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path => pathname === path)

  if (isAuthPath && token) {
    console.log('[Middleware] User already authenticated, redirecting')
    if (token.englishLevel === 'beginner') {
      const onboardingUrl = new URL('/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    } else {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/onboarding/:path*',
    '/dashboard/:path*',
    '/diary/:path*',
    '/write',
    '/login',
    '/register',
  ],
}