import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_TASK_STATUS_VALUES } from "@/lib/gemini-contract";
import { prisma } from "@/lib/prisma";

const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required."),
  columns: z
    .array(
      z.object({
        title: z.string().min(1),
        helper: z.string().optional(),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boards = await prisma.board.findMany({
      include: {
        notes: {
          select: {
            id: true,
          },
        },
        columns: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const boardsWithCounts = boards.map((board) => ({
      id: board.id,
      name: board.name,
      title: board.title,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      taskCount: board.notes.length,
      columns: board.columns,
    }));

    return NextResponse.json({ boards: boardsWithCounts });
  } catch (error) {
    console.error("boards GET route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch boards.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const parsed = createBoardSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") ||
      "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const defaultColumns = [
      { title: "Backlog", helper: "Ideas and items that are not in motion yet.", order: 0 },
      { title: "In Progress", helper: "Work currently being tackled.", order: 1 },
      { title: "Testing", helper: "Verifications, QA, or user review in flight.", order: 2 },
      { title: "Done", helper: "Completed work ready to close out.", order: 3 },
    ];

    const columns = parsed.data.columns || defaultColumns;

    const board = await prisma.board.create({
      data: {
        name: parsed.data.name,
        title: parsed.data.name,
        columns: {
          create: columns,
        },
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
    console.error("boards POST route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create board.",
      },
      { status: 500 }
    );
  }
}
