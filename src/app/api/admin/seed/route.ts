import { NextResponse } from "next/server";
import { seedAll } from "@/db/seed";

export async function POST() {
  try {
    await seedAll();
    return NextResponse.json({ success: true, message: "Seeding complete" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
