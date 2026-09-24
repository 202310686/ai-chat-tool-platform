import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const result = await (await db()).query<{ id: string; email: string; password_hash: string }>(
          "SELECT id, email, password_hash FROM users WHERE email = $1", [email]
        );
        const user = result.rows[0];
        if (!user || !(await compare(password, user.password_hash))) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
});

