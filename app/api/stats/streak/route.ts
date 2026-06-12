import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStreakData } from '@/lib/streak'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  try {
    const streakData = await getStreakData(userId)
    return NextResponse.json(streakData)
  } catch (error) {
    console.error('获取 streak 数据失败:', error)
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }
}