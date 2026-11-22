import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { scanStatus } from "@/lib/scan-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ running: false, startedAt: null }, { status: 401 });
  return NextResponse.json(await scanStatus(user.id), { headers: { "Cache-Control": "no-store" } });
}
