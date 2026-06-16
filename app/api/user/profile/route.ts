import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 更新用户资料
 * PUT /api/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    // 首先尝试从 NextAuth session 获取用户 ID
    const session = await getServerSession(authOptions)
    
    // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
    let userId = session?.user?.id
    if (!userId) {
      const userIdCookie = request.cookies.get('user-id')
      if (userIdCookie?.value) {
        userId = userIdCookie.value
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { displayName, avatar, englishLevel } = body

    // 验证 displayName
    if (displayName !== undefined) {
      if (typeof displayName !== 'string') {
        return NextResponse.json(
          { error: '昵称格式不正确' },
          { status: 400 }
        )
      }
      if (displayName.length > 50) {
        return NextResponse.json(
          { error: '昵称不能超过50个字符' },
          { status: 400 }
        )
      }
    }

    // 验证 avatar
    if (avatar !== undefined && avatar !== null) {
      if (typeof avatar !== 'string') {
        return NextResponse.json(
          { error: '头像格式不正确' },
          { status: 400 }
        )
      }
      if (avatar.length > 500) {
        return NextResponse.json(
          { error: '头像URL过长' },
          { status: 400 }
        )
      }
    }

    // 验证 englishLevel
    if (englishLevel !== undefined) {
      if (!['primary', 'junior', 'senior', 'cet4', 'cet6', 'ielts', 'toefl'].includes(englishLevel)) {
        return NextResponse.json(
          { error: '无效的英语水平' },
          { status: 400 }
        )
      }
    }

    // 更新用户资料
    const updateData: { displayName?: string; avatar?: string | null; englishLevel?: string } = {}
    if (displayName !== undefined) {
      updateData.displayName = displayName.trim() || null
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar || null
    }
    if (englishLevel !== undefined) {
      updateData.englishLevel = englishLevel
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        englishLevel: true,
      }
    })

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
    console.error('更新用户资料错误:', error)
    const errorMessage = error instanceof Error ? error.message : '更新用户资料失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 获取当前用户资料
 * GET /api/user/profile
 */
export async function GET(request: NextRequest) {
  try {
    // 首先尝试从 NextAuth session 获取用户 ID
    const session = await getServerSession(authOptions)
    
    // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
    let userId = session?.user?.id
    if (!userId) {
      const userIdCookie = request.cookies.get('user-id')
      if (userIdCookie?.value) {
        userId = userIdCookie.value
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        englishLevel: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('获取用户资料错误:', error)
    const errorMessage = error instanceof Error ? error.message : '获取用户资料失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
