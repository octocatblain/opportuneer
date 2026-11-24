import { NextResponse } from "next/server";
import { getUser, isSuper } from "@/lib/auth";
import { exportAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Download an account's data as JSON. Your own by default; the superuser may pass ?user=<id>. */
export async function GET(req: Request) {
  const me = await getUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });
  if (await rateLimited(`export:${me.id}`, 5, 10 * 60 * 1000)) return new NextResponse("Too many downloads. Try again in a few minutes.", { status: 429 });
  const wanted = new URL(req.url).searchParams.get("user");
  const id = wanted && wanted !== me.id ? (isSuper(me) ? wanted : null) : me.id;
  if (!id || !(await db.user.findUnique({ where: { id }, select: { id: true } }))) return new NextResponse("Not found", { status: 404 });
  const data = await exportAccount(id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="opportuneer-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
}
