import { getServerSession, type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { isDemo } from "./data";
import { getLocale } from "./server-locale";
import { translator } from "./locale";
import nodemailer from "nodemailer";

export function authReady() {
  return !isDemo() && Boolean(process.env.DATABASE_URL && process.env.NEXTAUTH_SECRET &&
    process.env.EMAIL_SERVER && process.env.EMAIL_FROM && process.env.NEXTAUTH_URL);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: process.env.EMAIL_SERVER ? [EmailProvider({
    server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM, maxAge: 15 * 60,
    async sendVerificationRequest({ identifier, url, provider }) {
      const t = translator(await getLocale());
      const transport = nodemailer.createTransport(provider.server);
      const result = await transport.sendMail({
        to: identifier, from: provider.from,
        subject: t("Sign in to Soukoukai", "Soukoukai ログイン"),
        text: `${t("Use this link to sign in to Soukoukai. It expires in 15 minutes and can be used once.", "次のリンクからSoukoukaiにログインしてください。有効期限は15分で、一度だけ利用できます。")}\n\n${url}\n\n${t("If you did not request this, ignore this email.", "心当たりがない場合は、このメールを無視してください。")}`
      });
      if (result.rejected.length || result.pending?.length) throw new Error("Sign-in email was rejected by the provider.");
    }
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
  return session?.user?.id ? db.user.findUnique({ where: { id: session.user.id } }) : null;
}
