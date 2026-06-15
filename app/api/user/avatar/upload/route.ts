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
 * 检查是否在 Vercel 生产环境中运行
 */
function isVercelProduction(): boolean {
  // Vercel 生产环境会设置这些环境变量
  return !!process.env.VERCEL && process.env.NODE_ENV === 'production'
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
  
  // 使用 __dirname 确保路径正确
  const projectRoot = path.resolve(__dirname, '../../../../')
  const filePath = path.join(projectRoot, 'public', 'uploads', 'avatars', fileName)
  
  console.log(`[saveAvatarToLocal] 项目根目录: ${projectRoot}`)
  console.log(`[saveAvatarToLocal] 文件保存路径: ${filePath}`)
  
  // 确保目录存在
  const dirPath = path.dirname(filePath)
  console.log(`[saveAvatarToLocal] 目录路径: ${dirPath}`)
  
  if (!fs.existsSync(dirPath)) {
    console.log(`[saveAvatarToLocal] 创建目录: ${dirPath}`)
    try {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`[saveAvatarToLocal] 目录创建成功`)
    } catch (mkdirError) {
      console.error(`[saveAvatarToLocal] 目录创建失败:`, mkdirError)
      throw new Error(`无法创建头像存储目录: ${(mkdirError as Error).message}`)
    }
  }
  
  // 保存文件
  try {
    fs.writeFileSync(filePath, buffer)
    console.log(`[saveAvatarToLocal] 文件保存成功: ${fileName}`)
  } catch (writeError) {
    console.error(`[saveAvatarToLocal] 文件写入失败:`, writeError)
    throw new Error(`无法保存头像文件: ${(writeError as Error).message}`)
  }
  
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
  console.log('[Avatar Upload API] 开始处理头像上传请求')
  
  try {
    // 首先尝试从 NextAuth session 获取用户 ID
    const session = await getServerSession(authOptions)
    console.log('[Avatar Upload API] Session 获取完成:', session ? '已获取' : '未获取')
    
    // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
    let userId = session?.user?.id
    if (!userId) {
      const userIdCookie = request.cookies.get('user-id')
      if (userIdCookie?.value) {
        userId = userIdCookie.value
      }
    }

    if (!userId) {
      console.log('[Avatar Upload API] 用户未授权，返回 401')
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    console.log('[Avatar Upload API] 用户ID:', userId)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      console.log('[Avatar Upload API] 未选择文件，返回 400')
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      )
    }

    console.log('[Avatar Upload API] 文件信息:', { name: file.name, type: file.type, size: file.size })

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('[Avatar Upload API] 文件类型不支持:', file.type)
      return NextResponse.json(
        { error: '不支持的文件格式，支持 JPG、PNG、WEBP 格式' },
        { status: 400 }
      )
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      console.log('[Avatar Upload API] 文件大小超过限制:', file.size)
      return NextResponse.json(
        { error: `文件大小超过限制，最大支持 ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExtension = file.type.split('/')[1]

    console.log('[Avatar Upload API] 文件读取完成，大小:', buffer.length)

    let avatarUrl: string
    const useBlob = isBlobConfigured()
    const inVercelProduction = isVercelProduction()
    console.log('[Avatar Upload API] 使用 Blob 存储:', useBlob)
    console.log('[Avatar Upload API] 是否在 Vercel 生产环境:', inVercelProduction)

    // Vercel 生产环境必须配置 Blob
    if (inVercelProduction && !useBlob) {
      console.error('[Avatar Upload API] Vercel 生产环境未配置 Blob 存储')
      return NextResponse.json(
        { error: '头像存储服务未配置，请联系管理员' },
        { status: 500 }
      )
    }

    try {
      if (useBlob) {
        // 使用 Vercel Blob 存储头像文件
        console.log('[Avatar Upload API] 开始上传到 Vercel Blob')
        const blobPath = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
        
        const { url } = await put(blobPath, buffer, {
          access: 'public',
          contentType: file.type,
        })
        
        avatarUrl = url
        console.log('[Avatar Upload API] Blob 上传成功:', avatarUrl)
      } else {
        // 备选方案：使用本地文件系统（仅开发环境）
        console.log('[Avatar Upload API] 开始保存到本地文件系统')
        avatarUrl = await saveAvatarToLocal(buffer, userId, fileExtension)
        console.log('[Avatar Upload API] 本地保存成功:', avatarUrl)
      }
    } catch (storageError) {
      console.error('[Avatar Upload API] 头像存储失败:', storageError)
      
      // 如果 Blob 存储失败，只有非生产环境才尝试回退到本地存储
      if (useBlob && !inVercelProduction) {
        console.log('[Avatar Upload API] Blob 存储失败，尝试回退到本地存储')
        try {
          avatarUrl = await saveAvatarToLocal(buffer, userId, fileExtension)
          console.warn('[Avatar Upload API] Blob 存储失败，已回退到本地存储')
        } catch (localError) {
          console.error('[Avatar Upload API] 本地存储也失败:', localError)
          return NextResponse.json(
            { error: '头像存储失败，请稍后重试' },
            { status: 500 }
          )
        }
      } else if (useBlob && inVercelProduction) {
        // Vercel 生产环境中 Blob 失败，直接返回错误
        const errorMsg = storageError instanceof Error ? storageError.message : '存储失败'
        console.error('[Avatar Upload API] Vercel Blob 存储失败:', errorMsg)
        return NextResponse.json(
          { error: '头像存储服务暂时不可用，请稍后重试' },
          { status: 500 }
        )
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