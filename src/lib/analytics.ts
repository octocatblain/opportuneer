import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Record a product event. Never throws: analytics must not break a request. */
export async function logEvent(name: string, userId: string | null = null, properties?: Prisma.InputJsonValue) {
  try {
    await db.analyticsEvent.create({ data: { name, userId, properties } });
  } catch {
    /* ignore */
  }
}
