import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import {
  GEMINI_PROMPT_VERSION,
  createTasksArgsSchema,
  updateTaskStatusArgsSchema,
  deleteTaskArgsSchema,
  updateTaskPropertiesArgsSchema,
  createBoardArgsSchema,
  updateBoardArgsSchema,
  deleteBoardArgsSchema,
  createColumnArgsSchema,
  updateColumnArgsSchema,
  deleteColumnArgsSchema,
  DEFAULT_TASK_STATUS_VALUES,
} from "@/lib/gemini-contract";
import { invokeGemini } from "@/lib/gemini";
import { prisma, getNextCaseNumber } from "@/lib/prisma";

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
    const nextCaseNumber = await getNextCaseNumber();
    const augmentedPrompt = `${command}\n\n[System: Start task numbering from TASK-${nextCaseNumber}]`;
    const functionCall = await invokeGemini(augmentedPrompt);

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
        newTitle: validated.newTitle,
        newDescription: validated.newDescription,
        newPriority: validated.newPriority,
      });
    } else if (functionCall.name === "create_board") {
      const validated = createBoardArgsSchema.parse(functionCall.args);
      const board = await persistBoardCreation({
        conversationId,
        command,
        result: validated,
      });
      return NextResponse.json({
        action: "create_board",
        board,
      });
    } else if (functionCall.name === "update_board") {
      const validated = updateBoardArgsSchema.parse(functionCall.args);
      const board = await persistBoardUpdate({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "update_board",
        board,
      });
    } else if (functionCall.name === "delete_board") {
      const validated = deleteBoardArgsSchema.parse(functionCall.args);
      await persistBoardDeletion({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "delete_board",
        boardId,
      });
    } else if (functionCall.name === "create_column") {
      const validated = createColumnArgsSchema.parse(functionCall.args);
      const column = await persistColumnCreation({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "create_column",
        column,
      });
    } else if (functionCall.name === "update_column") {
      const validated = updateColumnArgsSchema.parse(functionCall.args);
      const column = await persistColumnUpdate({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "update_column",
        column,
      });
    } else if (functionCall.name === "delete_column") {
      const validated = deleteColumnArgsSchema.parse(functionCall.args);
      await persistColumnDeletion({
        conversationId,
        command,
        result: validated,
        boardId,
      });
      return NextResponse.json({
        action: "delete_column",
        columnTitle: validated.title,
      });
    } else {
      throw new Error(
        `Unexpected function call "${functionCall.name}". Expected create_tasks_from_text, update_task_status, delete_task, update_task_properties, create_board, update_board, delete_board, create_column, update_column, or delete_column.`
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
      title: string;
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
    newTitle?: string;
    newDescription?: string;
    newPriority?: string;
  };
}

async function persistTaskPropertiesUpdate({
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

interface PersistBoardCreationInput {
  conversationId: string;
  command: string;
  result: {
    name: string;
    columns?: Array<{
      title: string;
      helper?: string;
    }>;
  };
}

async function persistBoardCreation({
  conversationId,
  command,
  result,
}: PersistBoardCreationInput) {
  const { name, columns } = result;

  const board = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const defaultColumns = columns || [
      { title: "Backlog", helper: "Tasks to be done" },
      { title: "In Progress", helper: "Tasks being worked on" },
      { title: "Testing", helper: "Tasks being tested" },
      { title: "Done", helper: "Completed tasks" },
    ];

    const newBoard = await tx.board.create({
      data: {
        name,
        title: name,
        columns: {
          create: defaultColumns.map((col, index) => ({
            title: col.title,
            helper: col.helper,
            order: index,
          })),
        },
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
      },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "create-board-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Created board "${name}" with ${defaultColumns.length} column(s).`,
          metadata: {
            type: "create-board-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });

    return newBoard;
  });

  return board;
}

interface PersistBoardUpdateInput {
  conversationId: string;
  command: string;
  result: {
    name: string;
  };
  boardId?: string;
}

async function persistBoardUpdate({
  conversationId,
  command,
  result,
  boardId,
}: PersistBoardUpdateInput) {
  const { name } = result;

  if (!boardId) {
    throw new NotFoundError("No active board to update.");
  }

  const board = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const existingBoard = await tx.board.findUnique({
      where: { id: boardId },
    });

    if (!existingBoard) {
      throw new NotFoundError("Board not found.");
    }

    const updatedBoard = await tx.board.update({
      where: { id: boardId },
      data: { name },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
      },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "update-board-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Board renamed to "${name}".`,
          metadata: {
            type: "update-board-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });

    return updatedBoard;
  });

  return board;
}

interface PersistBoardDeletionInput {
  conversationId: string;
  command: string;
  result: {
    confirmed: boolean;
  };
  boardId?: string;
}

async function persistBoardDeletion({
  conversationId,
  command,
  result,
  boardId,
}: PersistBoardDeletionInput) {
  const { confirmed } = result;

  if (!confirmed) {
    throw new Error("Board deletion not confirmed.");
  }

  if (!boardId) {
    throw new NotFoundError("No active board to delete.");
  }

  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const board = await tx.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError("Board not found.");
    }

    await tx.board.delete({
      where: { id: boardId },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "delete-board-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Board "${board.name}" has been deleted.`,
          metadata: {
            type: "delete-board-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });
  });
}

interface PersistColumnCreationInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
    helper?: string;
  };
  boardId?: string;
}

async function persistColumnCreation({
  conversationId,
  command,
  result,
  boardId,
}: PersistColumnCreationInput) {
  const { title, helper } = result;

  if (!boardId) {
    throw new NotFoundError("No active board to add column to.");
  }

  const column = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const board = await tx.board.findUnique({
      where: { id: boardId },
      include: {
        columns: true,
      },
    });

    if (!board) {
      throw new NotFoundError("Board not found.");
    }

    const maxOrder = board.columns.length > 0
      ? Math.max(...board.columns.map((c) => c.order))
      : -1;

    const newColumn = await tx.boardColumn.create({
      data: {
        boardId,
        title,
        helper,
        order: maxOrder + 1,
      },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "create-column-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Column "${title}" added to board.`,
          metadata: {
            type: "create-column-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });

    return newColumn;
  });

  return column;
}

interface PersistColumnUpdateInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
    newTitle?: string;
    newHelper?: string;
  };
  boardId?: string;
}

async function persistColumnUpdate({
  conversationId,
  command,
  result,
  boardId,
}: PersistColumnUpdateInput) {
  const { title, newTitle, newHelper } = result;

  if (!boardId) {
    throw new NotFoundError("No active board to update column in.");
  }

  const column = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const existingColumn = await tx.boardColumn.findFirst({
      where: {
        boardId,
        title,
      },
    });

    if (!existingColumn) {
      throw new NotFoundError(`Column "${title}" not found.`);
    }

    const updateData: {
      title?: string;
      helper?: string;
    } = {};

    if (newTitle) {
      updateData.title = newTitle;
    }

    if (newHelper !== undefined) {
      updateData.helper = newHelper;
    }

    const updatedColumn = await tx.boardColumn.update({
      where: { id: existingColumn.id },
      data: updateData,
    });

    const changes = [];
    if (newTitle) {
      changes.push(`renamed to "${newTitle}"`);
    }
    if (newHelper !== undefined) {
      changes.push("helper text updated");
    }

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "update-column-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Column "${title}" ${changes.join(" and ")}.`,
          metadata: {
            type: "update-column-response",
            promptVersion: GEMINI_PROMPT_VERSION,
            result,
          },
        },
      ],
    });

    return updatedColumn;
  });

  return column;
}

interface PersistColumnDeletionInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
  };
  boardId?: string;
}

async function persistColumnDeletion({
  conversationId,
  command,
  result,
  boardId,
}: PersistColumnDeletionInput) {
  const { title } = result;

  if (!boardId) {
    throw new NotFoundError("No active board to delete column from.");
  }

  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const column = await tx.boardColumn.findFirst({
      where: {
        boardId,
        title,
      },
    });

    if (!column) {
      throw new NotFoundError(`Column "${title}" not found.`);
    }

    await tx.boardColumn.delete({
      where: { id: column.id },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: command,
          metadata: {
            type: "delete-column-request",
            promptVersion: GEMINI_PROMPT_VERSION,
          },
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: `Column "${title}" has been deleted.`,
          metadata: {
            type: "delete-column-response",
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
