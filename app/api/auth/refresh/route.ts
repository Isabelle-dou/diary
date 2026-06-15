import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'

/**
 * 刷新用户Session
 * POST /api/auth/refresh
 * 
 * 用于用户更新profile后刷新session，确保JWT token包含最新的用户信息
 */
export async function POST(request: NextRequest) {
  try {
    // 首先获取当前session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    // 从数据库获取最新的用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        englishLevel: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 生成新的JWT token
    const secret = new TextEncoder().encode(authOptions.secret)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30天后过期

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      englishLevel: user.englishLevel,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt.getTime() / 1000)
      .sign(secret)

    // 创建响应
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        englishLevel: user.englishLevel,
      }
    }, { status: 200 })

    // 设置session cookie（与NextAuth使用相同的cookie名称）
    response.cookies.set({
      name: 'next-auth.session-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30天
      path: '/',
    })

    return response
  } catch (error: unknown) {
    console.error('刷新Session错误:', error)
    const errorMessage = error instanceof Error ? error.message : '刷新Session失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
