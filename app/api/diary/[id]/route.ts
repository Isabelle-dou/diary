import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const diary = await prisma.diary.findUnique({
      where: { id: params.id },
      include: { aiAnalysis: true },
    })

    if (!diary || diary.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Diary not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ diary }, { status: 200 })
  } catch (error) {
    console.error('Get diary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const diary = await prisma.diary.findUnique({
      where: { id: params.id },
    })

    if (!diary || diary.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Diary not found' },
        { status: 404 }
      )
    }

    await prisma.diary.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Diary deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete diary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
