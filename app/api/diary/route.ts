import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateStreak } from '@/lib/streak'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { title, content, date } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length

    const writingDate = date ? new Date(date) : new Date()
    
    const diary = await prisma.diary.create({
      data: {
        userId,
        title: title || 'Untitled',
        content,
        date: writingDate,
        wordCount,
      },
    })

    // 更新写作连续天数
    await updateStreak(userId, writingDate)

    return NextResponse.json(
      { message: 'Diary created successfully', diary },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create diary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const diaries = await prisma.diary.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { aiAnalysis: true },
    })

    return NextResponse.json({ diaries }, { status: 200 })
  } catch (error) {
    console.error('Get diaries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
