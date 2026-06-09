import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStreakData } from '@/lib/streak'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  try {
    const streakData = await getStreakData(session.user.id)
    return NextResponse.json(streakData)
  } catch (error) {
    console.error('获取 streak 数据失败:', error)
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }
}