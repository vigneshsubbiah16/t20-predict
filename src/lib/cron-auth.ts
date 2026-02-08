import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) {
    return false;
  }

  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!provided) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(envSecret);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }

  return timingSafeEqual(a, b);
}
