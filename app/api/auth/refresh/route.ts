import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // 返回最新的用户信息，供前端使用update()方法更新session
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        englishLevel: user.englishLevel,
      }
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('刷新Session错误:', error)
    const errorMessage = error instanceof Error ? error.message : '刷新Session失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
