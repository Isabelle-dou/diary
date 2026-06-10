import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      displayName?: string
      avatar?: string
      englishLevel: string
    }
  }

  interface User {
    id: string
    email: string
    displayName?: string
    avatar?: string
    englishLevel: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    displayName?: string
    avatar?: string
    englishLevel: string
  }
}
