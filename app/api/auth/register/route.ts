import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Registration API called')
    
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { email, password } = body

    console.log('Registration attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码都是必填项' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6个字符' },
        { status: 400 }
      )
    }

    let existingUser
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('Database error checking existing user:', dbError)
      return NextResponse.json(
        { error: '数据库查询失败，请稍后重试' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      )
    }

    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
    } catch (hashError) {
      console.error('Password hashing error:', hashError)
      return NextResponse.json(
        { error: '密码加密失败，请稍后重试' },
        { status: 500 }
      )
    }

    let user
    try {
      user = await prisma.user.create({
        data: {
          email,
          hashedPassword,
        },
      })
      console.log('User created successfully:', user.id)
    } catch (createError) {
      console.error('Database error creating user:', createError)
      return NextResponse.json(
        { error: '创建用户失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
