import { NextResponse } from "next/server";
import { scanStatus } from "@/lib/scan-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await scanStatus(), { headers: { "Cache-Control": "no-store" } });
}
