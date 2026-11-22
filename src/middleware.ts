import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userForToken } from "@/lib/auth";

// Signed-out visitors can only reach the public landing page ("/"), the sign-in pages, the Google sign-in
// routes and the app icons. Everything else needs a valid session.
// Runs on the Node.js runtime so it can check the session in the database.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|css|js)$).*)"],
};

const PUBLIC = ["/", "/manifest.webmanifest", "/apple-icon", "/login", "/register", "/waitlist", "/api/auth/google/start", "/api/auth/google/callback"];

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
