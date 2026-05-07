import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null
        if (user.blocked || user.suspend) return null

        // Try bcrypt first, then legacy MD5/plain
        let valid = false
        if (user.password) {
          valid = await bcrypt.compare(credentials.password, user.password)
        }
        if (!valid && user.pass) {
          // Legacy plain password check
          valid = credentials.password === user.pass
        }

        if (!valid) return null

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.photoThumb || user.photo || null,
          role: user.admin === 1 ? 'admin' : user.moderator ? 'moderator' : 'user',
          fake: user.fake === 1,
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.fake = (user as any).fake
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).fake = token.fake
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        })
        if (!existing) {
          const now = Math.floor(Date.now() / 1000)
          const config = await prisma.config.findFirst()
          await prisma.user.create({
            data: {
              name: user.name || '',
              email: user.email!,
              googleId: user.id,
              photo: user.image || '',
              photoThumb: user.image || '',
              verified: 1,
              credits: config?.freeCredits || 50,
              joinDate: new Date().toLocaleDateString(),
              joinDateTime: String(now),
              lastAccess: String(now),
            },
          })
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'rich-dating-network-secret-2024',
}
