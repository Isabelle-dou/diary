import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/collections - 添加收藏
 */
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, content, suggestion, definition, example, sourceDiaryId } = body

    // 验证必填字段
    if (!type || !content || !suggestion) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证 type
    if (!['word', 'phrase', 'collocation'].includes(type)) {
      return NextResponse.json(
        { error: '无效的收藏类型' },
        { status: 400 }
      )
    }

    // 创建收藏
    const collection = await prisma.collection.create({
      data: {
        userId,
        type,
        content,
        suggestion,
        definition: definition || null,
        example: example || null,
        sourceDiaryId: sourceDiaryId || null,
      },
    })

    return NextResponse.json({
      message: '收藏成功',
      collection,
    })
  } catch (error) {
    console.error('添加收藏失败:', error)
    return NextResponse.json(
      { error: '添加收藏失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collections - 获取收藏列表
 */
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'word' | 'phrase' | 'collocation' | null

    // 构建查询条件
    const where: any = {
      userId,
    }

    if (type && ['word', 'phrase', 'collocation'].includes(type)) {
      where.type = type
    }

    // 获取收藏列表
    const collections = await prisma.collection.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 统计各类型数量
    const stats = await prisma.collection.groupBy({
      by: ['type'],
      where: {
        userId,
      },
      _count: true,
    })

    const countMap = {
      word: 0,
      phrase: 0,
      collocation: 0,
    }

    stats.forEach((stat) => {
      if (stat.type in countMap) {
        countMap[stat.type as keyof typeof countMap] = stat._count
      }
    })

    return NextResponse.json({
      collections,
      stats: {
        total: collections.length,
        ...countMap,
      },
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    return NextResponse.json(
      { error: '获取收藏列表失败' },
      { status: 500 }
    )
  }
}
