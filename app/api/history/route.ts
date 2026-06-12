import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import History from "@/lib/models/History";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const history = await History.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Fetch history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
