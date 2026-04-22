import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { email, audience } = await request.json();

    if (!email || !audience) {
      return NextResponse.json(
        { success: false, error: "Email and audience are required" },
        { status: 400 },
      );
    }

    if (!["creator", "collector"].includes(audience)) {
      return NextResponse.json(
        { success: false, error: "Invalid audience type" },
        { status: 400 },
      );
    }

    const result = await addToWaitlist(email, audience);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to add to waitlist" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
