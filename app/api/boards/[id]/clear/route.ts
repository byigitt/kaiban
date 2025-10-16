import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().cuid("Provide a valid board identifier."),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") ||
      "Invalid board identifier.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const board = await prisma.board.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found." },
        { status: 404 }
      );
    }

    const deleted = await prisma.note.deleteMany({
      where: { boardId: board.id },
    });

    return NextResponse.json({ clearedCount: deleted.count });
  } catch (error) {
    console.error("clear board route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear board tasks.",
      },
      { status: 500 }
    );
  }
}
