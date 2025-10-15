import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const updateBoardSchema = z.object({
  name: z.string().min(1, "Board name is required."),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const parsed = updateBoardSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") ||
      "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const board = await prisma.board.update({
      where: { id },
      data: {
        name: parsed.data.name,
        title: parsed.data.name,
      },
      include: {
        columns: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    return NextResponse.json({ board });
  } catch (error) {
    console.error("boards PATCH route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update board.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    await prisma.board.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("boards DELETE route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete board.",
      },
      { status: 500 }
    );
  }
}
