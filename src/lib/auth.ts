import { getServerSession, type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { isDemo } from "./data";

export function authReady() {
  return !isDemo() && Boolean(process.env.DATABASE_URL && process.env.NEXTAUTH_SECRET &&
    process.env.EMAIL_SERVER && process.env.EMAIL_FROM && process.env.NEXTAUTH_URL);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: process.env.EMAIL_SERVER ? [EmailProvider({
    server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM, maxAge: 15 * 60
  })] : [],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin", verifyRequest: "/signin/sent", error: "/signin" },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    }
  }
};

export async function currentUser() {
  if (!authReady()) return null;
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
