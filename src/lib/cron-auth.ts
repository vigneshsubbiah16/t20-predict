import { NextRequest } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";

export function verifyCronSecret(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) {
    return false;
  }

  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!provided) {
    return false;
  }

  const a = createHmac("sha256", envSecret).update(provided).digest();
  const b = createHmac("sha256", envSecret).update(envSecret).digest();
  return timingSafeEqual(a, b);
}
