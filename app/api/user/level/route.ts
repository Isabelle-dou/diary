import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
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
      where: { id: session.user.id },
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