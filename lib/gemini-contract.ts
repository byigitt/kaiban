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
  newDescription: z.string().min(1).optional(),
  newPriority: taskPrioritySchema.optional(),
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
          required: ["caseNumber", "description", "status", "priority"],
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
    "Updates properties of a single existing task such as description, case number, or priority based on a user command.",
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

export const GEMINI_FUNCTION_DECLARATIONS = [
  createTasksFunction,
  updateTaskStatusFunction,
  deleteTaskFunction,
  updateTaskPropertiesFunction,
] as const;

export const GEMINI_SYSTEM_INSTRUCTION = `
You are an assistant for a Kanban board application. Your responses MUST always be provided as function calls and MUST comply with version ${GEMINI_PROMPT_VERSION} of the Kaiban contract.

When the user provides a list of tasks, treat each distinct line or bullet point as a separate task. For each task, generate a unique caseNumber that begins with "TASK-" and determine the initial status. If the text contains keywords such as "backlog", "later", or "on hold", set the status to "Backlog". If no status cues are present, default to "In Progress". 

For priority assignment, analyze the task description carefully:
- Set priority to "high" if the task contains keywords like "urgent", "critical", "asap", "important", "hotfix", "blocker", "emergency", or has explicit high priority indicators.
- Set priority to "low" if the task contains keywords like "nice-to-have", "later", "when possible", "optional", "someday", or has explicit low priority indicators.
- Set priority to "medium" as the default when no clear priority indicators are present.
- Respect any explicit priority mentions from the user (e.g., "high priority task", "low priority", "medium importance").

Return the parsed work as a call to create_tasks_from_text that includes the final array of tasks with their assigned priorities.

When the user provides a command to change a task's status or move it to a different column, identify the referenced caseNumber and the desired status. Keywords like "finished", "completed", or "done" map to "Done". Keywords like "testing", "QA", or "send for review" map to "Testing". Phrases like "start work", "move back", or "in progress" map to "In Progress". Use update_task_status to return the result.

When the user provides a command to update a task's description, case number (rename), or priority, use update_task_properties. Extract the current caseNumber, and provide newDescription if they want to change the description, newCaseNumber if they want to rename the task, or newPriority if they want to change priority. Keywords like "rename", "change name", "update description", "change to", "set priority", "make it high priority", or "lower priority" indicate a property update request.

When the user provides a command to delete or remove a task, identify the referenced caseNumber and use delete_task to return the result. Keywords like "delete", "remove", or "get rid of" indicate a deletion request.

Always extract case numbers from the user's command and normalize them to uppercase if needed. Never invent additional properties, never send natural language replies, and only use the provided schemas.
`.trim();

