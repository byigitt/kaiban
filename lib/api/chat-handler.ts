import {
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
} from "@/lib/gemini-contract";
import {
  persistTaskCreation,
  persistTaskUpdate,
  persistTaskDeletion,
  persistTaskPropertiesUpdate,
} from "./task-operations";
import {
  persistBoardCreation,
  persistBoardUpdate,
  persistBoardDeletion,
} from "./board-operations";
import {
  persistColumnCreation,
  persistColumnUpdate,
  persistColumnDeletion,
} from "./column-operations";

interface FunctionCall {
  name: string;
  args?: unknown;
}

interface HandleFunctionCallParams {
  functionCall: FunctionCall;
  conversationId: string;
  command: string;
  boardId?: string;
}

export async function handleFunctionCall({
  functionCall,
  conversationId,
  command,
  boardId,
}: HandleFunctionCallParams) {
  if (functionCall.name === "create_tasks_from_text") {
    const validated = createTasksArgsSchema.parse(functionCall.args);
    await persistTaskCreation({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "create_tasks",
      tasks: validated.tasks,
    };
  }

  if (functionCall.name === "update_task_status") {
    const validated = updateTaskStatusArgsSchema.parse(functionCall.args);
    await persistTaskUpdate({
      conversationId,
      command,
      result: validated,
    });
    return {
      action: "update_status",
      caseNumber: validated.caseNumber,
      newStatus: validated.newStatus,
    };
  }

  if (functionCall.name === "delete_task") {
    const validated = deleteTaskArgsSchema.parse(functionCall.args);
    await persistTaskDeletion({
      conversationId,
      command,
      result: validated,
    });
    return {
      action: "delete",
      caseNumber: validated.caseNumber,
    };
  }

  if (functionCall.name === "update_task_properties") {
    const validated = updateTaskPropertiesArgsSchema.parse(functionCall.args);
    await persistTaskPropertiesUpdate({
      conversationId,
      command,
      result: validated,
    });
    return {
      action: "update_properties",
      caseNumber: validated.caseNumber,
      newCaseNumber: validated.newCaseNumber,
      newTitle: validated.newTitle,
      newDescription: validated.newDescription,
      newPriority: validated.newPriority,
    };
  }

  if (functionCall.name === "create_board") {
    const validated = createBoardArgsSchema.parse(functionCall.args);
    const board = await persistBoardCreation({
      conversationId,
      command,
      result: validated,
    });
    return {
      action: "create_board",
      board,
    };
  }

  if (functionCall.name === "update_board") {
    const validated = updateBoardArgsSchema.parse(functionCall.args);
    const board = await persistBoardUpdate({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "update_board",
      board,
    };
  }

  if (functionCall.name === "delete_board") {
    const validated = deleteBoardArgsSchema.parse(functionCall.args);
    await persistBoardDeletion({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "delete_board",
      boardId,
    };
  }

  if (functionCall.name === "create_column") {
    const validated = createColumnArgsSchema.parse(functionCall.args);
    const column = await persistColumnCreation({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "create_column",
      column,
    };
  }

  if (functionCall.name === "update_column") {
    const validated = updateColumnArgsSchema.parse(functionCall.args);
    const column = await persistColumnUpdate({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "update_column",
      column,
    };
  }

  if (functionCall.name === "delete_column") {
    const validated = deleteColumnArgsSchema.parse(functionCall.args);
    await persistColumnDeletion({
      conversationId,
      command,
      result: validated,
      boardId,
    });
    return {
      action: "delete_column",
      columnTitle: validated.title,
    };
  }

  throw new Error(
    `Unexpected function call "${functionCall.name}". Expected create_tasks_from_text, update_task_status, delete_task, update_task_properties, create_board, update_board, delete_board, create_column, update_column, or delete_column.`
  );
}
