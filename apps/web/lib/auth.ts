import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://api:3001/v1'
        console.log('[AUTH] Attempting login with API URL:', apiUrl)
        const res = await fetch(
          `${apiUrl}/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          }
        )

        if (!res.ok) return null
        const data = await res.json()

        return {
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name ?? "",
          role: data.user.role,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user)
      return token
    },

    async session({ session, token }) {
      session.user = token as any
      return session
    },
  },

  pages: {
    signIn: "/auth/signin",
  },
})
