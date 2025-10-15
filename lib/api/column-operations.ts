import { GEMINI_PROMPT_VERSION } from "@/lib/gemini-contract";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "./errors";

export interface PersistColumnCreationInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
    helper?: string;
  };
  boardId?: string;
}

export async function persistColumnCreation({
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

export interface PersistColumnUpdateInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
    newTitle?: string;
    newHelper?: string;
  };
  boardId?: string;
}

export async function persistColumnUpdate({
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

export interface PersistColumnDeletionInput {
  conversationId: string;
  command: string;
  result: {
    title: string;
  };
  boardId?: string;
}

export async function persistColumnDeletion({
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
