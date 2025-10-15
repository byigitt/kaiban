import { z } from "zod";

export const GEMINI_PROMPT_VERSION = "2025-10-15";

export const DEFAULT_TASK_STATUS_VALUES = [
  "Backlog",
  "In Progress",
  "Testing",
  "Done",
] as const;

export const TASK_STATUS_VALUES = DEFAULT_TASK_STATUS_VALUES;

export const TASK_PRIORITY_VALUES = ["low", "medium", "high"] as const;

export type TaskStatus = string;
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export interface Task {
  caseNumber: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export const taskStatusSchema = z.string().min(1);
export const taskPrioritySchema = z.enum(TASK_PRIORITY_VALUES);

export const createTasksArgsSchema = z.object({
  tasks: z.array(
    z.object({
      caseNumber: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      status: taskStatusSchema,
      priority: taskPrioritySchema,
    })
  ),
});

export const updateTaskStatusArgsSchema = z.object({
  caseNumber: z.string().min(1),
  newStatus: taskStatusSchema,
});

export const deleteTaskArgsSchema = z.object({
  caseNumber: z.string().min(1),
});

export const updateTaskPropertiesArgsSchema = z.object({
  caseNumber: z.string().min(1),
  newCaseNumber: z.string().min(1).optional(),
  newTitle: z.string().min(1).optional(),
  newDescription: z.string().min(1).optional(),
  newPriority: taskPrioritySchema.optional(),
});

export const createBoardArgsSchema = z.object({
  name: z.string().min(1),
  columns: z.array(
    z.object({
      title: z.string().min(1),
      helper: z.string().optional(),
    })
  ).optional(),
});

export const updateBoardArgsSchema = z.object({
  name: z.string().min(1),
});

export const deleteBoardArgsSchema = z.object({
  confirmed: z.boolean(),
});

export const createColumnArgsSchema = z.object({
  title: z.string().min(1),
  helper: z.string().optional(),
});

export const updateColumnArgsSchema = z.object({
  title: z.string().min(1),
  newTitle: z.string().min(1).optional(),
  newHelper: z.string().optional(),
});

export const deleteColumnArgsSchema = z.object({
  title: z.string().min(1),
});

export const createTasksFunction = {
  name: "create_tasks_from_text",
  description:
    "Parses a block of text to create a list of structured task objects for the Kanban board.",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "An array of task objects.",
        items: {
          type: "object",
          properties: {
            caseNumber: {
              type: "string",
              description:
                "A unique identifier generated for the task, e.g., 'TASK-101'.",
            },
            title: {
              type: "string",
              description:
                "A concise, descriptive title for the task (5-8 words max). This should summarize the task at a glance.",
            },
            description: {
              type: "string",
              description: "The full description of the task.",
            },
            status: {
              type: "string",
              description: "The initial status of the task.",
              enum: TASK_STATUS_VALUES,
            },
            priority: {
              type: "string",
              description: "The priority level of the task.",
              enum: TASK_PRIORITY_VALUES,
            },
          },
          required: ["caseNumber", "title", "description", "status", "priority"],
        },
      },
    },
    required: ["tasks"],
  },
} as const;

export const updateTaskStatusFunction = {
  name: "update_task_status",
  description:
    "Updates the status of a single existing task based on a user command.",
  parameters: {
    type: "object",
    properties: {
      caseNumber: {
        type: "string",
        description: "The identifier of the task to be updated.",
      },
      newStatus: {
        type: "string",
        description: "The target status for the task.",
        enum: TASK_STATUS_VALUES,
      },
    },
    required: ["caseNumber", "newStatus"],
  },
} as const;

export const deleteTaskFunction = {
  name: "delete_task",
  description:
    "Deletes a single existing task based on a user command.",
  parameters: {
    type: "object",
    properties: {
      caseNumber: {
        type: "string",
        description: "The identifier of the task to be deleted.",
      },
    },
    required: ["caseNumber"],
  },
} as const;

export const updateTaskPropertiesFunction = {
  name: "update_task_properties",
  description:
    "Updates properties of a single existing task such as title, description, case number, or priority based on a user command.",
  parameters: {
    type: "object",
    properties: {
      caseNumber: {
        type: "string",
        description: "The current identifier of the task to be updated.",
      },
      newCaseNumber: {
        type: "string",
        description: "The new case number for the task (optional).",
      },
      newTitle: {
        type: "string",
        description: "The new title for the task (optional).",
      },
      newDescription: {
        type: "string",
        description: "The new description for the task (optional).",
      },
      newPriority: {
        type: "string",
        description: "The new priority level for the task (optional).",
        enum: TASK_PRIORITY_VALUES,
      },
    },
    required: ["caseNumber"],
  },
} as const;

export const createBoardFunction = {
  name: "create_board",
  description:
    "Creates a new board with an optional set of custom columns. If columns are not specified, default columns will be created.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the new board.",
      },
      columns: {
        type: "array",
        description: "Optional array of columns to create for the board.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the column.",
            },
            helper: {
              type: "string",
              description: "Optional description or helper text for the column.",
            },
          },
          required: ["title"],
        },
      },
    },
    required: ["name"],
  },
} as const;

export const updateBoardFunction = {
  name: "update_board",
  description:
    "Updates the name of the currently active board.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The new name for the board.",
      },
    },
    required: ["name"],
  },
} as const;

export const deleteBoardFunction = {
  name: "delete_board",
  description:
    "Deletes the currently active board and all its tasks. Requires confirmation.",
  parameters: {
    type: "object",
    properties: {
      confirmed: {
        type: "boolean",
        description: "Must be true to confirm deletion of the board.",
      },
    },
    required: ["confirmed"],
  },
} as const;

export const createColumnFunction = {
  name: "create_column",
  description:
    "Adds a new column to the currently active board.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the new column.",
      },
      helper: {
        type: "string",
        description: "Optional description or helper text for the column.",
      },
    },
    required: ["title"],
  },
} as const;

export const updateColumnFunction = {
  name: "update_column",
  description:
    "Updates the title and/or helper text of an existing column on the currently active board.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The current title of the column to update.",
      },
      newTitle: {
        type: "string",
        description: "The new title for the column (optional).",
      },
      newHelper: {
        type: "string",
        description: "The new helper text for the column (optional).",
      },
    },
    required: ["title"],
  },
} as const;

export const deleteColumnFunction = {
  name: "delete_column",
  description:
    "Deletes a column from the currently active board. All tasks in this column will also be deleted.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the column to delete.",
      },
    },
    required: ["title"],
  },
} as const;

export const GEMINI_FUNCTION_DECLARATIONS = [
  createTasksFunction,
  updateTaskStatusFunction,
  deleteTaskFunction,
  updateTaskPropertiesFunction,
  createBoardFunction,
  updateBoardFunction,
  deleteBoardFunction,
  createColumnFunction,
  updateColumnFunction,
  deleteColumnFunction,
] as const;

export const GEMINI_SYSTEM_INSTRUCTION = `
You are an assistant for a Kanban board application. Your responses MUST always be provided as function calls and MUST comply with version ${GEMINI_PROMPT_VERSION} of the Kaiban contract.

When the user provides a list of tasks, treat each distinct line or bullet point as a separate task. For each task:
- Generate a unique caseNumber that begins with "TASK-"
- Create a concise title (5-8 words maximum) that summarizes the task at a glance
- Provide the full description with all details
- Determine the initial status. If the text contains keywords such as "backlog", "later", or "on hold", set the status to "Backlog". If no status cues are present, default to "In Progress"

For priority assignment, analyze the task description carefully:
- Set priority to "high" if the task contains keywords like "urgent", "critical", "asap", "important", "hotfix", "blocker", "emergency", or has explicit high priority indicators.
- Set priority to "low" if the task contains keywords like "nice-to-have", "later", "when possible", "optional", "someday", or has explicit low priority indicators.
- Set priority to "medium" as the default when no clear priority indicators are present.
- Respect any explicit priority mentions from the user (e.g., "high priority task", "low priority", "medium importance").

Return the parsed work as a call to create_tasks_from_text that includes the final array of tasks with their caseNumber, title, description, status, and priority.

When the user provides a command to change a task's status or move it to a different column, identify the referenced caseNumber and the desired status. Keywords like "finished", "completed", or "done" map to "Done". Keywords like "testing", "QA", or "send for review" map to "Testing". Phrases like "start work", "move back", or "in progress" map to "In Progress". Use update_task_status to return the result.

When the user provides a command to update a task's title, description, case number (rename), or priority, use update_task_properties. Extract the current caseNumber, and provide newTitle if they want to change the title, newDescription if they want to change the description, newCaseNumber if they want to rename the task, or newPriority if they want to change priority. Keywords like "rename", "change name", "update title", "update description", "change to", "set priority", "make it high priority", or "lower priority" indicate a property update request.

When the user provides a command to delete or remove a task, identify the referenced caseNumber and use delete_task to return the result. Keywords like "delete", "remove", or "get rid of" indicate a deletion request.

When the user provides a command to create a new board, use create_board. Extract the board name and any optional column definitions. Keywords like "create board", "new board", "make a board", or "start a board" indicate a board creation request. If the user specifies columns (e.g., "with columns X, Y, Z"), include them in the columns array.

When the user provides a command to rename or update the current board, use update_board. Extract the new board name. Keywords like "rename board", "change board name", "update board to", or "call this board" indicate a board update request.

When the user provides a command to delete the current board, use delete_board with confirmed set to true. Keywords like "delete board", "remove board", "delete this board", or "get rid of board" indicate a board deletion request.

When the user provides a command to add a new column to the current board, use create_column. Extract the column title and optional helper text. Keywords like "add column", "create column", "new column", or "make a column" indicate a column creation request.

When the user provides a command to update a column's title or helper text, use update_column. Extract the current column title and the new title and/or helper text. Keywords like "rename column", "update column", "change column", or "modify column" indicate a column update request.

When the user provides a command to delete a column, use delete_column. Extract the column title. Keywords like "delete column", "remove column", or "get rid of column" indicate a column deletion request.

Always extract case numbers from the user's command and normalize them to uppercase if needed. Never invent additional properties, never send natural language replies, and only use the provided schemas.
`.trim();

