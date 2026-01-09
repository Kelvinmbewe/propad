import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const authConfig = {
    debug: true,
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" as const },

    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(credentials),
                    }
                )

                if (!res.ok) return null
                const data = await res.json()

                return {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.role = user.role
                token.accessToken = user.accessToken
                token.refreshToken = user.refreshToken
            }
            return token
        },

        async session({ session, token }: any) {
            session.user.id = token.id
            session.user.role = token.role
            session.accessToken = token.accessToken
            return session
        },
    },

    pages: {
        signIn: "/auth/signin",
    },
}

const { handlers } = NextAuth(authConfig)

export const GET = handlers.GET
export const POST = handlers.POST
