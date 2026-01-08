import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const NEXTAUTH_URL =
    process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

const NEXTAUTH_SECRET =
    process.env.NEXTAUTH_SECRET ?? 'propad-dev-secret';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const authOptions: NextAuthOptions = {
    debug: true,
    secret: NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        console.error('Missing credentials');
                        return null;
                    }

                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) {
                        console.error('Auth API failed', await res.text());
                        return null;
                    }

                    const data = await res.json();

                    if (!data?.user?.id || !data?.user?.email) {
                        console.error('Invalid API login payload', data);
                        return null;
                    }

                    // 🔥 STRICT NextAuth User object (THIS FIXES IT)
                    return {
                        id: String(data.user.id),
                        email: String(data.user.email),
                        name: data.user.name ?? data.user.email,
                    };
                } catch (err) {
                    console.error('Authorize exception', err);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: false,
            },
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
