import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    console.log('[Simple Login] Attempting login for:', email)

    // 验证输入
    if (!email || !password) {
      return NextResponse.json({ success: false, message: '缺少邮箱或密码' }, { status: 400 })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.log('[Simple Login] User not found:', email)
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
    
    if (!passwordMatch) {
      console.log('[Simple Login] Password mismatch for:', email)
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    console.log('[Simple Login] Login successful for:', user.id)
    
    // 返回用户信息
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        englishLevel: user.englishLevel,
        hasSetLevel: user.englishLevel !== 'beginner'
      }
    }, { status: 200 })

  } catch (error) {
    console.error('[Simple Login] Error:', error)
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}