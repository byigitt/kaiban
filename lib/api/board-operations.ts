import { GEMINI_PROMPT_VERSION } from "@/lib/gemini-contract";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "./errors";

export interface PersistBoardCreationInput {
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

export async function persistBoardCreation({
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

export interface PersistBoardUpdateInput {
  conversationId: string;
  command: string;
  result: {
    name: string;
  };
  boardId?: string;
}

export async function persistBoardUpdate({
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

export interface PersistBoardDeletionInput {
  conversationId: string;
  command: string;
  result: {
    confirmed: boolean;
  };
  boardId?: string;
}

export async function persistBoardDeletion({
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
