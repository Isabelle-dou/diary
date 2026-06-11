import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  console.log('[Direct Login] API called')
  
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('[Direct Login] Email:', email)

    // 验证输入
    if (!email || !password) {
      console.log('[Direct Login] Missing credentials')
      return NextResponse.json({ success: false, message: '请输入邮箱和密码' }, { status: 400 })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.log('[Direct Login] User not found:', email)
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    console.log('[Direct Login] User found:', user.id)

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
    
    if (!passwordMatch) {
      console.log('[Direct Login] Password mismatch')
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    // 创建 JWT token
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      secret,
      { expiresIn: '1d' }
    )

    // 设置 cookie
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 1天
      path: '/',
    })

    console.log('[Direct Login] Login successful for user:', user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        englishLevel: user.englishLevel,
        hasSetLevel: user.englishLevel !== 'beginner',
      },
    }, { status: 200 })

  } catch (error) {
    console.error('[Direct Login] Error:', error)
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 })
  }
}
