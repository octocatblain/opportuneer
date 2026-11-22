import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userForToken } from "@/lib/auth";

// Every request except the sign-in pages and the Google sign-in routes needs a valid session.
// Runs on the Node.js runtime so it can check the session in the database.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|css|js)$).*)"],
};

const PUBLIC = ["/login", "/register", "/api/auth/google/start", "/api/auth/google/callback"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC.includes(pathname);
  const session = await userForToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (session) {
    if (pathname === "/login" || pathname === "/register") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (isPublic) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}
