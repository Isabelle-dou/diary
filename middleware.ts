import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 跳过 API 路由和静态资源
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') ||
      pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|css|js)$/)) {
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
    if (userIdCookie && userIdCookie.value) {
      try {
        // 使用 Response 对象传递用户信息，避免在 middleware 中直接查询数据库
        token = {
          id: userIdCookie.value,
          email: 'user@example.com', // 临时占位，实际 email 在页面中获取
          englishLevel: 'beginner', // 临时占位，实际 level 在页面中获取
        } as any
      } catch (error) {
        console.error('[Middleware] Error verifying user cookie:', error)
      }
    }
  }

  const protectedPaths = ['/onboarding', '/dashboard', '/diary', '/write']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname === '/onboarding' && token.englishLevel !== 'beginner') {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path => pathname === path)

  if (isAuthPath && token) {
    // 注意：这里需要实际的用户级别信息才能正确跳转
    // 暂时不重定向已登录用户，让他们自己选择
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