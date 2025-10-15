import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    const [conversations, tasks, boards] = await Promise.all([
      prisma.conversation.findMany({
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
          notes: boardId
            ? {
                where: {
                  boardId,
                },
              }
            : true,
          boards: {
            include: {
              columns: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.note.findMany({
        where: boardId
          ? {
              boardId,
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.board.findMany({
        include: {
          columns: {
            orderBy: {
              order: "asc",
            },
          },
          notes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const boardsWithCounts = boards.map((board) => ({
      ...board,
      taskCount: board.notes.length,
    }));

    return NextResponse.json({
      conversations,
      tasks,
      boards: boardsWithCounts,
    });
  } catch (error) {
    console.error("data route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch data from database.",
      },
      { status: 500 }
    );
  }
}
