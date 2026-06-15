import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// 从环境变量获取 NextAuth Secret，如果不存在则使用默认值（仅开发环境）
const nextAuthSecret = process.env.NEXTAUTH_SECRET

if (!nextAuthSecret && process.env.NODE_ENV === 'production') {
  console.warn('[NextAuth] WARNING: NEXTAUTH_SECRET is not set. This is required in production!')
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret || 'development-secret-do-not-use-in-production',
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your-email@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'your-password',
        },
      },
      async authorize(credentials) {
        console.log('[NextAuth] ====== Authorize 开始 ======')
        console.log('[NextAuth] Authorize called with email:', credentials?.email)
        console.log('[NextAuth] Credentials received:', credentials ? 'Yes' : 'No')
        console.log('[NextAuth] Refresh mode:', credentials?.refresh === 'true')

        try {
          if (!credentials?.email) {
            console.log('[NextAuth] Missing email')
            console.log('[NextAuth] ====== Authorize 结束（缺少邮箱） ======')
            return null
          }

          console.log('[NextAuth] Finding user in database...')
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          })

          console.log('[NextAuth] User found:', user ? 'Yes' : 'No')
          
          if (!user) {
            console.log('[NextAuth] User not found:', credentials.email)
            console.log('[NextAuth] ====== Authorize 结束（用户不存在） ======')
            return null
          }

          // 如果是刷新模式（refresh=true），跳过密码验证
          // 这用于用户更新profile后刷新session
          if (credentials?.refresh === 'true') {
            console.log('[NextAuth] Refresh mode: skipping password check')
            console.log('[NextAuth] Session refreshed for user:', user.id)
            console.log('[NextAuth] ====== Authorize 结束（刷新模式） ======')
            return {
              id: user.id,
              email: user.email,
              displayName: user.displayName ?? undefined,
              avatar: user.avatar ?? undefined,
              englishLevel: user.englishLevel,
            }
          }

          // 正常登录模式：需要密码验证
          if (!credentials?.password) {
            console.log('[NextAuth] Missing password in normal login mode')
            console.log('[NextAuth] ====== Authorize 结束（缺少密码） ======')
            return null
          }

          console.log('[NextAuth] User ID:', user.id)
          console.log('[NextAuth] User email:', user.email)
          console.log('[NextAuth] hashedPassword exists:', !!user.hashedPassword)
          console.log('[NextAuth] hashedPassword length:', user.hashedPassword?.length || 0)

          if (!user.hashedPassword) {
            console.log('[NextAuth] ERROR: User has no hashedPassword')
            console.log('[NextAuth] ====== Authorize 结束（无密码哈希） ======')
            return null
          }

          console.log('[NextAuth] Comparing passwords...')
          console.log('[NextAuth] Password to check length:', credentials.password.length)
          
          let passwordMatch = false
          try {
            passwordMatch = await bcrypt.compare(
              credentials.password,
              user.hashedPassword
            )
            console.log('[NextAuth] Password comparison result:', passwordMatch)
          } catch (bcryptError) {
            console.error('[NextAuth] bcrypt compare error:', bcryptError)
            console.log('[NextAuth] ====== Authorize 结束（bcrypt错误） ======')
            return null
          }

          if (!passwordMatch) {
            console.log('[NextAuth] Password does not match')
            console.log('[NextAuth] Stored hash (first 20 chars):', user.hashedPassword.substring(0, 20))
            console.log('[NextAuth] ====== Authorize 结束（密码不匹配） ======')
            return null
          }

          console.log('[NextAuth] Authentication successful for user:', user.id)
          console.log('[NextAuth] ====== Authorize 结束（成功） ======')
          return {
            id: user.id,
            email: user.email,
            displayName: user.displayName ?? undefined,
            avatar: user.avatar ?? undefined,
            englishLevel: user.englishLevel,
          }
        } catch (error) {
          console.error('[NextAuth] ====== Authorize 异常结束 ======')
          console.error('[NextAuth] Authorization error:', error)
          console.error('[NextAuth] Error type:', typeof error)
          console.error('[NextAuth] Error stack:', error instanceof Error ? error.stack : 'N/A')
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.displayName = user.displayName
        token.avatar = user.avatar
        token.englishLevel = user.englishLevel
      }

      if (trigger === 'update') {
        if (session?.englishLevel) {
          token.englishLevel = session.englishLevel
        }
        if (session?.user?.displayName !== undefined) {
          token.displayName = session.user.displayName
        }
        if (session?.user?.avatar !== undefined) {
          token.avatar = session.user.avatar
        }
      }

      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        displayName: token.displayName as string | undefined,
        avatar: token.avatar as string | undefined,
        englishLevel: token.englishLevel as string,
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
}
