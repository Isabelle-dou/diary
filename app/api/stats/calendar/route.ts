import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getCalendarData } from '@/lib/streak'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || '') || new Date().getFullYear()
  const month = parseInt(searchParams.get('month') || '') || new Date().getMonth() + 1
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: '无效的日期参数' }, { status: 400 })
  }
  
  try {
    const calendarData = await getCalendarData(session.user.id, year, month)
    return NextResponse.json({ year, month, data: calendarData })
  } catch (error) {
    console.error('获取日历数据失败:', error)
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }
}