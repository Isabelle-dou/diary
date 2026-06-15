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
    console.log('[Refresh API] ====== 开始 ======')
    
    // 首先尝试从 NextAuth session 获取用户 ID
    const session = await getServerSession(authOptions)
    console.log('[Refresh API] NextAuth session:', session ? '存在' : '不存在')
    console.log('[Refresh API] NextAuth session user ID:', session?.user?.id)
    
    // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
    let userId = session?.user?.id
    if (!userId) {
      const userIdCookie = request.cookies.get('user-id')
      console.log('[Refresh API] user-id cookie:', userIdCookie ? userIdCookie.value : '不存在')
      if (userIdCookie?.value) {
        userId = userIdCookie.value
      }
    }
    
    console.log('[Refresh API] 最终 userId:', userId)
    
    if (!userId) {
      console.log('[Refresh API] ====== 结束（未授权） ======')
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    // 从数据库获取最新的用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
