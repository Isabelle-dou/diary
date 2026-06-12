/**
 * 统一认证处理工具
 * 支持 NextAuth session 和自定义 user-id cookie 两种认证方式
 */

import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'
import { authOptions } from './auth'

/**
 * 获取用户 ID
 * 优先从 NextAuth session 获取，如果没有则从自定义 user-id cookie 获取
 * 
 * @param request - NextRequest 对象
 * @returns 用户 ID（如果未认证则返回 null）
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  // 首先尝试从 NextAuth session 获取用户 ID
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return session.user.id
  }

  // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
  const userIdCookie = request.cookies.get('user-id')
  if (userIdCookie?.value) {
    return userIdCookie.value
  }

  // 未认证
  return null
}

/**
 * 获取用户 ID 并验证
 * 如果未认证则抛出错误
 * 
 * @param request - NextRequest 对象
 * @returns 用户 ID
 * @throws 未授权错误
 */
export async function getUserIdOrThrow(request: NextRequest): Promise<string> {
  const userId = await getUserId(request)
  
  if (!userId) {
    throw new Error('未授权访问，请先登录')
  }
  
  return userId
}