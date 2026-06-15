import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

/**
 * 检查是否配置了 Vercel Blob
 */
function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

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
 * 使用本地文件系统保存头像（备选方案）
 */
async function saveAvatarToLocal(buffer: Buffer, userId: string, fileExtension: string): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', fileName)
  
  // 确保目录存在
  const dirPath = path.dirname(filePath)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  
  // 保存文件
  fs.writeFileSync(filePath, buffer)
  
  // 返回访问 URL
  return `/uploads/avatars/${fileName}`
}

/**
 * 删除本地头像文件
 */
function deleteLocalAvatar(fileUrl: string): void {
  try {
    // 提取本地路径
    const filePath = path.join(process.cwd(), 'public', fileUrl)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.warn('删除本地头像文件失败:', error)
  }
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
    const fileExtension = file.type.split('/')[1]

    let avatarUrl: string
    const useBlob = isBlobConfigured()

    try {
      if (useBlob) {
        // 使用 Vercel Blob 存储头像文件
        const blobPath = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
        
        const { url } = await put(blobPath, buffer, {
          access: 'public',
          contentType: file.type,
        })
        
        avatarUrl = url
      } else {
        // 备选方案：使用本地文件系统
        avatarUrl = await saveAvatarToLocal(buffer, userId, fileExtension)
      }
    } catch (storageError) {
      console.error('头像存储失败:', storageError)
      
      // 如果 Blob 存储失败，尝试回退到本地存储（仅开发环境）
      if (useBlob) {
        try {
          avatarUrl = await saveAvatarToLocal(buffer, userId, fileExtension)
          console.warn('Blob 存储失败，已回退到本地存储')
        } catch (localError) {
          return NextResponse.json(
            { error: '头像存储失败，请稍后重试' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: '头像存储失败，请稍后重试' },
          { status: 500 }
        )
      }
    }

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
    
    // 提供更友好的错误提示
    let userMessage = errorMessage
    if (errorMessage.includes('No blob credentials')) {
      userMessage = '头像存储服务未配置，请联系管理员'
    } else if (errorMessage.includes('read-only file system')) {
      userMessage = '服务器存储不可用，请稍后重试'
    }
    
    return NextResponse.json(
      { error: userMessage },
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

    // 从存储中删除文件
    const useBlob = isBlobConfigured()
    try {
      if (useBlob && url.includes('blob.vercel-storage.com')) {
        // 从 Vercel Blob 中删除
        const blobPath = new URL(url).pathname.substring(1)
        await del(blobPath)
      } else if (!url.includes('blob.vercel-storage.com')) {
        // 从本地文件系统删除
        deleteLocalAvatar(url)
      }
    } catch (deleteError) {
      console.warn('删除头像文件失败:', deleteError)
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