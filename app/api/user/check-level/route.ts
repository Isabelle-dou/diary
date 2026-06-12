import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { englishLevel: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const englishLevel = user.englishLevel || 'beginner'
    const hasSetLevel = englishLevel !== 'beginner'

    return NextResponse.json(
      {
        hasSetLevel,
        englishLevel,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Check level error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
