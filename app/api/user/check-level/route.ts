import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const englishLevel = session.user.englishLevel
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
