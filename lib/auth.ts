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
        console.log('[NextAuth] Authorize called with email:', credentials?.email)

        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[NextAuth] Missing credentials')
            return null
          }

          console.log('[NextAuth] Finding user in database...')
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          })

          if (!user) {
            console.log('[NextAuth] User not found:', credentials.email)
            return null
          }

          console.log('[NextAuth] User found, comparing passwords...')
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          if (!passwordMatch) {
            console.log('[NextAuth] Password does not match')
            return null
          }

          console.log('[NextAuth] Authentication successful for user:', user.id)
          return {
            id: user.id,
            email: user.email,
            displayName: user.displayName ?? undefined,
            avatar: user.avatar ?? undefined,
            englishLevel: user.englishLevel,
          }
        } catch (error) {
          console.error('[NextAuth] Authorization error:', error)
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
