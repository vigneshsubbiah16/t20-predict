import { NextRequest, NextResponse } from "next/server";
import { seedAll } from "@/db/seed";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await seedAll();
    return NextResponse.json({ success: true, message: "Seeding complete" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
