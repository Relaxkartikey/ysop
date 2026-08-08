import { NextResponse } from "next/server";
import { cleanupExpiredFiles } from "@/server/cleanup.server";

/**
 * Vercel Cron target. Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`
 * automatically (see vercel.json) — any request without a matching header is rejected,
 * so this can't be triggered by an outside caller hammering the URL.
 */
export async function GET(request: Request) {
  const secret = process.env["CRON_SECRET"];
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredFiles();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Expired-file cleanup failed", err);
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
}
