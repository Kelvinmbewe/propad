import NextAuth from "next-auth"
import { authConfig } from "@/app/api/auth/[...nextauth]/route"

export const { auth, signIn, signOut } = NextAuth(authConfig)
