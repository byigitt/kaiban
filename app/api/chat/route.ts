import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import {
  GEMINI_PROMPT_VERSION,
  createTasksArgsSchema,
  updateTaskStatusArgsSchema,
  deleteTaskArgsSchema,
  updateTaskPropertiesArgsSchema,
} from "@/lib/gemini-contract";
import { invokeGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  command: z.string().min(1, "Provide a command to parse."),
  conversationId: z
    .string()
    .cuid("Provide a valid conversation identifier."),
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
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") || "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { command, conversationId, boardId } = parsed.data;
    const functionCall = await invokeGemini(command);

    if (functionCall.name === "create_tasks_from_text") {
      const validated = createTasksArgsSchema.parse(functionCall.args);
      await persistTaskCreation({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "create_tasks",
        tasks: validated.tasks,
      });
    } else if (functionCall.name === "update_task_status") {
      const validated = updateTaskStatusArgsSchema.parse(functionCall.args);
      await persistTaskUpdate({
        conversationId,
        command,
        result: validated,
      });
      return NextResponse.json({
        action: "update_status",
        caseNumber: validated.caseNumber,
        newStatus: validated.newStatus,
      });
    } else if (functionCall.name === "delete_task") {
      const validated = deleteTaskArgsSchema.parse(functionCall.args);
      await persistTaskDeletion({
        conversationId,
        command,
        result: validated,
      });
      return NextResponse.json({
        action: "delete",
        caseNumber: validated.caseNumber,
      });
    } else if (functionCall.name === "update_task_properties") {
      const validated = updateTaskPropertiesArgsSchema.parse(functionCall.args);
      await persistTaskPropertiesUpdate({
        conversationId,
        command,
        result: validated,
      });
      return NextResponse.json({
        action: "update_properties",
        caseNumber: validated.caseNumber,
        newCaseNumber: validated.newCaseNumber,
        newDescription: validated.newDescription,
        newPriority: validated.newPriority,
      });
    } else {
      throw new Error(
        `Unexpected function call "${functionCall.name}". Expected create_tasks_from_text, update_task_status, delete_task, or update_task_properties.`
      );
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("chat route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process command.",
      },
      { status: 500 }
    );
  }
}

interface PersistTaskCreationInput {
  conversationId: string;
  command: string;
  result: {
    tasks: Array<{
      caseNumber: string;
      description: string;
      status: string;
      priority: string;
    }>;
  };
  boardId?: string;
}

async function persistTaskCreation({
  conversationId,
  command,
  result,
  boardId,
}: PersistTaskCreationInput) {
  const { tasks } = result;

  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    for (const task of tasks) {
      const existingNote = await tx.note.findUnique({
        where: { caseNumber: task.caseNumber },
      });

      if (existingNote) {
        throw new Error(`Task ${task.caseNumber} already exists.`);
      }
    }

    const now = new Date().toISOString();

    const notesData = tasks.map((task) => ({
      caseNumber: task.caseNumber,
      title: task.caseNumber,
      body: task.description,
      status: task.status,
      priority: task.priority,
      boardId: boardId || null,
      conversationId,
      metadata: {
        createdVia: "create-tasks",
        createdAt: now,
        promptVersion: GEMINI_PROMPT_VERSION,
      },
    }));

    await tx.note.createMany({
      data: notesData,
    });

    const taskList = tasks
      .map((t) => `${t.caseNumber}: ${t.description}`)
      .join("\n");

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "create-tasks-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Created ${tasks.length} task(s):\n${taskList}`,
          metadata: {
            type: "create-tasks-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });
  });
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

interface PersistTaskDeletionInput {
  conversationId: string;
  command: string;
  result: { caseNumber: string };
}

async function persistTaskDeletion({
  conversationId,
  command,
  result,
}: PersistTaskDeletionInput) {
  const { caseNumber } = result;

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

    await tx.note.delete({
      where: { id: note.id },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "delete-task-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `${caseNumber} has been deleted.`,
          metadata: {
            type: "delete-task-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });
  });
}

interface PersistTaskPropertiesUpdateInput {
  conversationId: string;
  command: string;
  result: {
    caseNumber: string;
    newCaseNumber?: string;
    newDescription?: string;
    newPriority?: string;
  };
}

async function persistTaskPropertiesUpdate({
  conversationId,
  command,
  result,
}: PersistTaskPropertiesUpdateInput) {
  const { caseNumber, newCaseNumber, newDescription, newPriority } = result;

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

    if (newCaseNumber && newCaseNumber !== caseNumber) {
      const existingNote = await tx.note.findUnique({
        where: { caseNumber: newCaseNumber },
      });

      if (existingNote) {
        throw new Error(`Task ${newCaseNumber} already exists.`);
      }
    }

    const metadata =
      note.metadata && typeof note.metadata === "object" && !Array.isArray(note.metadata)
        ? (note.metadata as Prisma.JsonObject)
        : ({} as Prisma.JsonObject);

    const updatedMetadata: Prisma.JsonObject = {
      ...metadata,
      updatedVia: "update-task-properties",
      updatedAt: new Date().toISOString(),
    };

    const updateData: {
      caseNumber?: string;
      title?: string;
      body?: string;
      priority?: string;
      metadata: Prisma.JsonObject;
    } = {
      metadata: updatedMetadata,
    };

    if (newCaseNumber) {
      updateData.caseNumber = newCaseNumber;
      updateData.title = newCaseNumber;
    }

    if (newDescription) {
      updateData.body = newDescription;
    }

    if (newPriority) {
      updateData.priority = newPriority;
    }

    await tx.note.update({
      where: { id: note.id },
      data: updateData,
    });

    const changes = [];
    if (newCaseNumber) {
      changes.push(`renamed to ${newCaseNumber}`);
    }
    if (newDescription) {
      changes.push("description updated");
    }
    if (newPriority) {
      changes.push(`priority changed to ${newPriority}`);
    }

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "update-task-properties-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `${caseNumber} ${changes.join(" and ")}.`,
          metadata: {
            type: "update-task-properties-response",
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
