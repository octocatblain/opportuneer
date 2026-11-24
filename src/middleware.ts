import { NextResponse, type NextRequest } from "next/server";
import { inviteForToken, SESSION_COOKIE, userForToken } from "@/lib/auth";
import { onboardingSteps } from "@/lib/kyc";
import { canEnterSpace, homeFor, isSpace, SPACE_COOKIE } from "@/lib/spaces";

// Two areas, one shared sign-in at /login (/admin/login just redirects there):
//   /admin/**          superuser only
//   /client/<space>/** clients; space is jobs | pitches | duo and must match the
//                      account's track access. The superuser may enter every space.
// Signed-out visitors can only reach the landing page, the sign-in pages, the Google sign-in routes and app icons.
// Runs on the Node.js runtime so it can check the session in the database.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|ico|css|js)$).*)"],
};

const PUBLIC = ["/", "/manifest.webmanifest", "/apple-icon", "/login", "/register", "/waitlist", "/waitlist/confirm", "/pricing", "/privacy", "/terms", "/admin/login", "/api/auth/google/start", "/api/auth/google/callback"];
// Pre-/client URLs: old bookmarks are sent to the same page inside the account's own space.
const LEGACY = /^\/(pipeline|jobs|companies|opportunities|add|settings)(\/|$)/;

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await userForToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    // The sign-up page exists only behind a valid invitation link.
    if (pathname === "/register" && !(await inviteForToken(req.nextUrl.searchParams.get("invite")))) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Sign-up is by invitation only. Use the invitation link you were sent.")}`, req.url));
    if (PUBLIC.includes(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  const { user } = session;
  const home = homeFor(user);
  const go = (to: string) => NextResponse.redirect(new URL(to, req.url));

  if (pathname === "/") return go(home);
  if (pathname === "/login" || pathname === "/register" || pathname === "/admin/login") return go(home);

  // First-login KYC: regular accounts finish onboarding before the workspace opens; once done (or for the owner) /onboarding leads home.
  if (pathname === "/onboarding") return (await onboardingSteps(user)).length ? NextResponse.next() : go(home);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return user.role === "SUPERUSER" ? NextResponse.next() : go(home);

  if (pathname === "/client" || pathname === "/client/") return go(home);
  if (pathname.startsWith("/client/")) {
    const space = pathname.split("/")[2];
    if (!isSpace(space)) return NextResponse.next(); // falls through to the 404 page
    if (!canEnterSpace(user, space)) return go(home);
    if ((await onboardingSteps(user)).length) return go("/onboarding");
    const res = NextResponse.next();
    // Remembered so server actions and the admin's role switcher know which space is being used.
    res.cookies.set(SPACE_COOKIE, space, { path: "/", sameSite: "lax", httpOnly: true });
    return res;
  }

  if (LEGACY.test(pathname) && user.role !== "SUPERUSER") return go(`${home}${pathname}${search}`);
  if (LEGACY.test(pathname)) return go(`/client/duo${pathname}${search}`);
  return NextResponse.next();
}
