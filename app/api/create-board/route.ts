import { NextResponse } from "next/server";
import { z } from "zod";

import {
  GEMINI_PROMPT_VERSION,
  createTasksArgsSchema,
} from "@/lib/gemini-contract";
import { invokeGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  text: z.string().min(1, "Provide at least one line of text."),
  boardId: z.string().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message = [...flattened.formErrors, ...fieldErrors].join(" ") || "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const functionCall = await invokeGemini(parsed.data.text);
    if (functionCall.name !== "create_tasks_from_text") {
      throw new Error(
        `Unexpected function call "${functionCall.name}". Expected create_tasks_from_text.`
      );
    }

    const validated = createTasksArgsSchema.parse(functionCall.args);
    const result = await persistBoardCreation({
      text: parsed.data.text,
      tasks: validated.tasks,
      boardId: parsed.data.boardId,
    });
    return NextResponse.json({
      tasks: validated.tasks,
      conversationId: result.conversationId,
      boardId: result.boardId,
    });
  } catch (error) {
    console.error("create-board route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create tasks from provided text.",
      },
      { status: 500 }
    );
  }
}

interface PersistBoardCreationInput {
  text: string;
  tasks: { caseNumber: string; description: string; status: string; priority: string }[];
  boardId?: string;
}

async function persistBoardCreation({
  text,
  tasks,
  boardId,
}: PersistBoardCreationInput) {
  const conversation = await prisma.conversation.create({
    data: {
      topic: deriveTopic(text),
      messages: {
        create: [
          {
            role: "USER",
            content: text,
            metadata: {
              type: "create-board-request",
              promptVersion: GEMINI_PROMPT_VERSION,
            },
          },
          {
            role: "ASSISTANT",
            content: `Generated ${tasks.length} tasks.`,
            metadata: {
              type: "create-board-response",
              promptVersion: GEMINI_PROMPT_VERSION,
              tasks,
            },
          },
        ],
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.note.createMany({
    data: tasks.map((task) => ({
      title: task.caseNumber,
      body: task.description,
      caseNumber: task.caseNumber,
      status: task.status,
      priority: task.priority,
      boardId: boardId || null,
      conversationId: conversation.id,
      metadata: {
        source: "gemini",
      },
    })),
  });

  return {
    conversationId: conversation.id,
    boardId: boardId || null,
  };
}

function deriveTopic(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? trimmed;
  if (!firstLine) {
    return null;
  }

  return firstLine.slice(0, 120);
}
