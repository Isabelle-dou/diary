import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateStreak } from '@/lib/streak'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
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
        userId: session.user.id,
        title: title || 'Untitled',
        content,
        date: writingDate,
        wordCount,
      },
    })

    // 更新写作连续天数
    await updateStreak(session.user.id, writingDate)

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const diaries = await prisma.diary.findMany({
      where: { userId: session.user.id },
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
