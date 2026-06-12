import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/collections/[id] - 删除收藏
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // 检查收藏是否存在
    const collection = await prisma.collection.findUnique({
      where: { id },
    })

    if (!collection) {
      return NextResponse.json(
        { error: '收藏不存在' },
        { status: 404 }
      )
    }

    // 检查权限
    if (collection.userId !== userId) {
      return NextResponse.json(
        { error: '无权删除此收藏' },
        { status: 403 }
      )
    }

    // 删除收藏
    await prisma.collection.delete({
      where: { id },
    })

    return NextResponse.json({
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除收藏失败:', error)
    return NextResponse.json(
      { error: '删除收藏失败' },
      { status: 500 }
    )
  }
}
