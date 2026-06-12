import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateStreak } from '@/lib/streak'

const PAGE_SIZE = 20

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * PAGE_SIZE

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        include: {
          aiAnalysis: true,
        },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.diary.count({
        where: { userId },
      }),
    ])

    const result = diaries.map(diary => ({
      id: diary.id,
      title: diary.title,
      content: diary.content,
      date: diary.date,
      wordCount: diary.wordCount,
      aiAnalyzed: diary.aiAnalyzed,
      overallScore: diary.aiAnalysis?.overallScore || null,
    }))

    return NextResponse.json({ 
      diaries: result, 
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('Get diaries error:', error)
    const errorMessage = error instanceof Error ? error.message : '获取日记列表失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

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
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, date } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '日记内容不能为空' },
        { status: 400 }
      )
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length

    const diary = await prisma.diary.create({
      data: {
        userId,
        title: title || '无标题',
        content,
        date: date ? new Date(date) : new Date(),
        wordCount,
      },
      select: {
        id: true,
        title: true,
        content: true,
        date: true,
        wordCount: true,
      },
    })

    // 保存日记成功后，更新 streak
    await updateStreak(userId, diary.date)

    return NextResponse.json(
      {
        diaryId: diary.id,
        title: diary.title,
        content: diary.content,
        date: diary.date,
        wordCount: diary.wordCount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建日记错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}