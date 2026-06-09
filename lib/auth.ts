import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? undefined,
          avatar: user.avatar ?? undefined,
          englishLevel: user.englishLevel,
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
