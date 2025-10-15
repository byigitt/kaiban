import { Prisma } from "@prisma/client";
import { GEMINI_PROMPT_VERSION } from "@/lib/gemini-contract";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "./errors";

export interface PersistTaskCreationInput {
  conversationId: string;
  command: string;
  result: {
    tasks: Array<{
      caseNumber: string;
      title: string;
      description: string;
      status: string;
      priority: string;
    }>;
  };
  boardId?: string;
}

export async function persistTaskCreation({
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
      title: task.title,
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

export interface PersistTaskUpdateInput {
  conversationId: string;
  command: string;
  result: { caseNumber: string; newStatus: string };
}

export async function persistTaskUpdate({
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

export interface PersistTaskDeletionInput {
  conversationId: string;
  command: string;
  result: { caseNumber: string };
}

export async function persistTaskDeletion({
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

export interface PersistTaskPropertiesUpdateInput {
  conversationId: string;
  command: string;
  result: {
    caseNumber: string;
    newCaseNumber?: string;
    newTitle?: string;
    newDescription?: string;
    newPriority?: string;
  };
}

export async function persistTaskPropertiesUpdate({
  conversationId,
  command,
  result,
}: PersistTaskPropertiesUpdateInput) {
  const { caseNumber, newCaseNumber, newTitle, newDescription, newPriority } = result;

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
    }

    if (newTitle) {
      updateData.title = newTitle;
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
    if (newTitle) {
      changes.push("title updated");
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
