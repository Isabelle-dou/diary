import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[Direct Login] ====== API 调用开始 ======')
  console.log('[Direct Login] 时间:', new Date().toLocaleTimeString())
  
  try {
    console.log('[Direct Login] 步骤1: 解析请求体...')
    const body = await request.json()
    const { email, password } = body
    console.log('[Direct Login] 步骤1完成: 邮箱:', email)

    // 验证输入
    if (!email || !password) {
      console.log('[Direct Login] 步骤2: 缺少凭据')
      return NextResponse.json({ success: false, message: '请输入邮箱和密码' }, { status: 400 })
    }

    console.log('[Direct Login] 步骤2: 查询用户...')
    const user = await prisma.user.findUnique({
      where: { email },
    })
    console.log('[Direct Login] 步骤2完成: 用户是否找到:', !!user)

    if (!user) {
      console.log('[Direct Login] 用户不存在:', email)
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    console.log('[Direct Login] 步骤3: 验证密码...')
    const passwordMatch = await bcryptjs.compare(password, user.hashedPassword)
    console.log('[Direct Login] 步骤3完成: 密码匹配:', passwordMatch)
    
    if (!passwordMatch) {
      console.log('[Direct Login] 密码不匹配')
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 401 })
    }

    console.log('[Direct Login] 步骤4: 设置 Cookie...')
    
    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        englishLevel: user.englishLevel,
        hasSetLevel: user.englishLevel !== 'beginner',
      },
    }, { status: 200 })

    // 使用 response.cookies.set() 来设置 cookie（API Route 的正确方式）
    response.cookies.set('user-id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    })
    
    console.log('[Direct Login] 步骤4完成: Cookie已设置')

    const duration = Date.now() - startTime
    console.log('[Direct Login] ====== API 调用成功 ======')
    console.log('[Direct Login] 耗时:', duration, 'ms')

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Direct Login] ====== API 调用失败 ======')
    console.error('[Direct Login] 耗时:', duration, 'ms')
    console.error('[Direct Login] 错误:', error)
    console.error('[Direct Login] 错误类型:', error instanceof Error ? error.name : 'Unknown')
    console.error('[Direct Login] 错误信息:', error instanceof Error ? error.message : 'N/A')
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 })
  }
}
