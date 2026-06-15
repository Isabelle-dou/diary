import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put, del, list } from '@vercel/blob'
import path from 'path'

/**
 * 解析头像历史记录 JSON 字符串
 */
function parseAvatarHistory(jsonString: string | null): string[] {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString) as string[]
  } catch {
    return []
  }
}

/**
 * 将头像历史记录转换为 JSON 字符串
 */
function stringifyAvatarHistory(history: string[]): string {
  return JSON.stringify(history)
}

/**
 * 上传头像
 * POST /api/user/avatar/upload
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
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件格式，支持 JPG、PNG、WEBP 格式' },
        { status: 400 }
      )
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小超过限制，最大支持 ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())

    // 生成唯一文件名
    const fileExtension = file.type.split('/')[1]
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
    
    // 使用 Vercel Blob 存储头像文件
    // 路径格式: avatars/{userId}/{fileName}
    const blobPath = `avatars/${userId}/${fileName}`
    
    // 上传到 Vercel Blob
    const { url: avatarUrl } = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.type,
    })

    // 获取当前用户的头像历史
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarHistory: true },
    })

    // 用户不存在，可能是数据库被重置了
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在，请重新登录' },
        { status: 404 }
      )
    }

    // 解析历史记录并更新（保留最近10个）
    const existingHistory = parseAvatarHistory(user?.avatarHistory)
    const newHistory = [
      avatarUrl,
      ...(user?.avatar ? [user.avatar] : []),
      ...existingHistory,
    ].slice(0, 10)

    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        avatarHistory: stringifyAvatarHistory(newHistory),
      },
      select: {
        id: true,
        displayName: true,
        avatar: true,
        avatarHistory: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      avatarUrl,
      user: {
        ...updatedUser,
        avatarHistory: parseAvatarHistory(updatedUser.avatarHistory),
      },
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('上传头像错误:', error)
    const errorMessage = error instanceof Error ? error.message : '上传头像失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 获取头像历史记录
 * GET /api/user/avatar/upload
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
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarHistory: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 解析历史记录
    const historyArray = parseAvatarHistory(user.avatarHistory)

    // 返回当前头像和历史记录
    const history = [
      ...(user.avatar ? [{ url: user.avatar, isCurrent: true }] : []),
      ...historyArray.map((url) => ({ url, isCurrent: false })),
    ]

    return NextResponse.json({
      success: true,
      history,
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('获取头像历史错误:', error)
    const errorMessage = error instanceof Error ? error.message : '获取头像历史失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 删除头像历史记录
 * DELETE /api/user/avatar/upload
 */
export async function DELETE(request: NextRequest) {
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
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: '请提供要删除的头像URL' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarHistory: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 不能删除当前头像
    if (user.avatar === url) {
      return NextResponse.json(
        { error: '不能删除当前使用的头像' },
        { status: 400 }
      )
    }

    // 解析并从历史记录中移除
    const existingHistory = parseAvatarHistory(user.avatarHistory)
    const updatedHistory = existingHistory.filter((h) => h !== url)

    // 从 Vercel Blob 中删除文件
    try {
      // 提取 Blob 路径（从 URL 中提取）
      const blobPath = new URL(url).pathname.substring(1) // 移除开头的 '/'
      await del(blobPath)
    } catch (deleteError) {
      console.warn('删除 Blob 文件失败:', deleteError)
      // 删除失败不阻止数据库更新
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarHistory: stringifyAvatarHistory(updatedHistory) },
    })

    return NextResponse.json({
      success: true,
      message: '删除成功',
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('删除头像历史错误:', error)
    const errorMessage = error instanceof Error ? error.message : '删除头像历史失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}