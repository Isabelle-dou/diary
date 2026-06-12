import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { englishLevel } = body

    if (!englishLevel || !['beginner', 'intermediate', 'advanced'].includes(englishLevel)) {
      return NextResponse.json(
        { error: '无效的英语水平' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { englishLevel },
      select: {
        id: true,
        email: true,
        displayName: true,
        englishLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        message: '英语水平更新成功',
        user: updatedUser,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新水平错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}