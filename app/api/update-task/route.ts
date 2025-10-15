import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import {
  GEMINI_PROMPT_VERSION,
  updateTaskStatusArgsSchema,
} from "@/lib/gemini-contract";
import { invokeGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  command: z.string().min(1, "Provide a command to parse."),
  conversationId: z
    .string()
    .cuid("Provide a valid conversation identifier."),
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
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") || "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { command, conversationId } = parsed.data;
    const functionCall = await invokeGemini(command);
    if (functionCall.name !== "update_task_status") {
      throw new Error(
        `Unexpected function call "${functionCall.name}". Expected update_task_status.`
      );
    }

    const validated = updateTaskStatusArgsSchema.parse(functionCall.args);
    await persistTaskUpdate({
      conversationId,
      command,
      result: validated,
    });
    return NextResponse.json(validated);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("update-task route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse task update command.",
      },
      { status: 500 }
    );
  }
}

interface PersistTaskUpdateInput {
  conversationId: string;
  command: string;
  result: { caseNumber: string; newStatus: string };
}

async function persistTaskUpdate({
  conversationId,
  command,
  result,
}: PersistTaskUpdateInput) {
  const { caseNumber, newStatus } = result;

  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const note = await tx.note.findUnique({
      where: { caseNumber },
    });

    if (!note) {
      throw new NotFoundError(`Task ${caseNumber} not found in the database.`);
    }

    const metadata =
      note.metadata && typeof note.metadata === "object" && !Array.isArray(note.metadata)
        ? (note.metadata as Prisma.JsonObject)
        : ({} as Prisma.JsonObject);

    const updatedMetadata: Prisma.JsonObject = {
      ...metadata,
      status: newStatus,
      updatedVia: "update-task",
      updatedAt: new Date().toISOString(),
    };

    await tx.note.update({
      where: { id: note.id },
      data: {
        status: newStatus,
        metadata: updatedMetadata,
      },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "update-task-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `${caseNumber} moved to ${newStatus}.`,
          metadata: {
            type: "update-task-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });
  });
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
