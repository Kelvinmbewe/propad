import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const { handlers } = NextAuth({
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
                console.log("🟢 AUTHORIZE CALLED")
                console.log("📨 Credentials:", {
                    email: credentials?.email,
                    hasPassword: Boolean(credentials?.password),
                })
                try {
                    if (!credentials?.email || !credentials?.password) {
                        console.error("❌ Missing credentials")
                        return null
                    }

                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email: credentials.email,
                                password: credentials.password,
                            }),
                        }
                    )

                    console.log("🌐 API response status:", res.status)

                    if (!res.ok) {
                        console.error("❌ API login failed", res.status)
                        return null
                    }

                    const data = await res.json()

                    console.log("📦 API response body:", data)

                    // HARD VALIDATION (prevents CallbackRouteError)
                    if (
                        !data ||
                        !data.user ||
                        !data.user.id ||
                        !data.user.email
                    ) {
                        console.error("❌ Invalid API response shape", data)
                        return null
                    }

                    return {
                        id: String(data.user.id),       // MUST be string
                        email: data.user.email,
                        name: data.user.name ?? "",
                        role: data.user.role ?? "USER",
                        accessToken: data.accessToken ?? "",
                        refreshToken: data.refreshToken ?? "",
                    }
                } catch (err) {
                    console.error("❌ Authorize exception", err)
                    return null
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.role = user.role
                token.accessToken = user.accessToken
                token.refreshToken = user.refreshToken
            }
            return token
        },

        async session({ session, token }) {
            session.user.id = token.id as string
            session.user.role = token.role as string
            session.accessToken = token.accessToken as string
            return session
        },
    },

    pages: {
        signIn: "/auth/signin",
    },
})

export const GET = handlers.GET
export const POST = handlers.POST
