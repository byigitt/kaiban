import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 }
      );
    }

    await prisma.conversationMessage.deleteMany({
      where: {
        conversationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("clear-messages route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear messages.",
      },
      { status: 500 }
    );
  }
}
