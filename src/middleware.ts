import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  const locale = lang === "en" || lang === "ja" ? lang : request.cookies.get("locale")?.value === "ja" ? "ja" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-soukoukai-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  if (lang === "en" || lang === "ja") response.cookies.set("locale", lang, { path: "/", sameSite: "lax", maxAge: 31536000 });
  return response;
}
export const config = { matcher: ["/((?!_next|favicon.ico|api/stripe|api/cron).*)"] };
