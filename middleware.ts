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
  // 只要 cookie 存在，就认为是已认证用户
  if (!token) {
    const userIdCookie = request.cookies.get('user-id')
    if (userIdCookie?.value) {
      // 只要 user-id cookie 存在，就创建一个简单的 token 对象
      token = {
        id: userIdCookie.value,
      } as any
    }
  }

  const protectedPaths = ['/onboarding', '/dashboard', '/diary', '/write', '/collection']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path => pathname === path)

  if (isAuthPath && token) {
    // 已登录用户访问登录页，重定向到 dashboard
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
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