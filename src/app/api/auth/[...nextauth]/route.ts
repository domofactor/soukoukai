import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions, authReady } from "@/lib/auth";

const handler = NextAuth(authOptions);
function unavailable() {
  return Response.json({ error: "Sign-in is unavailable until email and database setup is complete." }, { status: 503 });
}
async function authHandler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return authReady() ? handler(request, context) : unavailable();
}
export { authHandler as GET, authHandler as POST };
