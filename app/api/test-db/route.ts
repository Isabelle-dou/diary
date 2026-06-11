import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[Test-DB] Testing database connection...')
    
    // 测试 Prisma 连接
    const start = Date.now()
    const users = await prisma.user.findMany({ take: 5 })
    const duration = Date.now() - start
    
    console.log('[Test-DB] Database connection successful')
    console.log('[Test-DB] Found users:', users.length)
    console.log('[Test-DB] Query duration:', duration, 'ms')
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userCount: users.length,
      users: users.map(u => ({ id: u.id, email: u.email, englishLevel: u.englishLevel })),
      duration: `${duration}ms`
    })
  } catch (error) {
    console.error('[Test-DB] Database connection failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}