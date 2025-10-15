import * as React from "react";
import type { Task, TaskStatus } from "@/lib/gemini-contract";
import type { KanbanColumn } from "@/components/kanban/kanban-board";
import type { Notice } from "@/lib/types/board-types";

const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "Backlog",
    title: "Backlog",
    helper: "Ideas and items that are not in motion yet.",
  },
  {
    id: "In Progress",
    title: "In Progress",
    helper: "Work currently being tackled.",
  },
  {
    id: "Testing",
    title: "Testing",
    helper: "Verifications, QA, or user review in flight.",
  },
  {
    id: "Done",
    title: "Done",
    helper: "Completed work ready to close out.",
  },
];

interface UseTaskManagerProps {
  conversationId: string | null;
  setNotice: (notice: Notice | null) => void;
}

export function useTaskManager({ conversationId, setNotice }: UseTaskManagerProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [columns, setColumns] = React.useState<KanbanColumn[]>(DEFAULT_COLUMNS);

  const moveTask = React.useCallback(
    (caseNumber: string, nextStatus: TaskStatus) => {
      let dragNotice: Notice | null = null;
      setTasks((previous) => {
        const index = previous.findIndex(
          (task) => task.caseNumber === caseNumber
        );
        if (index === -1) {
          dragNotice = {
            tone: "error",
            message: `Gemini has not created ${caseNumber} yet.`,
          };
          return previous;
        }

        if (previous[index].status === nextStatus) {
          dragNotice = {
            tone: "info",
            message: `${caseNumber} is already in ${nextStatus}.`,
          };
          return previous;
        }

        const next = [...previous];
        next[index] = { ...previous[index], status: nextStatus };
        dragNotice = {
          tone: "info",
          message: `${caseNumber} moved to ${nextStatus}.`,
        };
        return next;
      });

      if (dragNotice) {
        setNotice(dragNotice);
      }
    },
    [setNotice]
  );

  const addTask = React.useCallback(
    ({
      status,
      caseNumber,
      title,
      description,
      priority,
    }: {
      status: TaskStatus;
      caseNumber: string;
      title: string;
      description: string;
      priority: "low" | "medium" | "high";
    }) => {
      const trimmedCaseNumber = caseNumber.trim().toUpperCase();
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      if (!trimmedCaseNumber || !trimmedTitle || !trimmedDescription) {
        return "Case number, title, and description are all required.";
      }
      const exists = tasks.some(
        (task) => task.caseNumber === trimmedCaseNumber
      );
      if (exists) {
        setNotice({
          tone: "error",
          message: `${trimmedCaseNumber} already exists on the board.`,
        });
        return "This case number is already on the board.";
      }
      setTasks((previous) => [
        ...previous,
        {
          caseNumber: trimmedCaseNumber,
          title: trimmedTitle,
          description: trimmedDescription,
          status,
          priority,
        },
      ]);
      setNotice({
        tone: "info",
        message: `${trimmedCaseNumber} added to ${status}.`,
      });
      return null;
    },
    [tasks, setNotice]
  );

  const removeTask = React.useCallback(
    async (caseNumber: string) => {
      if (!conversationId) {
        setNotice({
          tone: "error",
          message: "No conversation active. Cannot delete task.",
        });
        return;
      }

      const response = await fetch("/api/delete-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `delete ${caseNumber}`,
          conversationId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "Failed to delete task.";
        setNotice({
          tone: "error",
          message,
        });
        return;
      }

      setTasks((previous) =>
        previous.filter((task) => task.caseNumber !== caseNumber)
      );

      setNotice({
        tone: "info",
        message: `${caseNumber} removed from the board.`,
      });
    },
    [conversationId, setNotice]
  );

  const editTask = React.useCallback(
    async (
      caseNumber: string,
      updates: {
        newCaseNumber?: string;
        title?: string;
        description?: string;
        priority?: "low" | "medium" | "high";
      }
    ): Promise<string | null> => {
      const response = await fetch(`/api/tasks/${caseNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "Failed to update task.";
        setNotice({
          tone: "error",
          message,
        });
        return message;
      }

      const updatedTask = data as Task;
      setTasks((previous) => {
        const index = previous.findIndex(
          (task) => task.caseNumber === caseNumber
        );
        if (index === -1) {
          return previous;
        }
        const next = [...previous];
        next[index] = updatedTask;
        return next;
      });

      const changes = [];
      if (updates.newCaseNumber) {
        changes.push(`renamed to ${updates.newCaseNumber}`);
      }
      if (updates.title) {
        changes.push("title updated");
      }
      if (updates.description) {
        changes.push("description updated");
      }
      if (updates.priority) {
        changes.push(`priority changed to ${updates.priority}`);
      }

      setNotice({
        tone: "info",
        message: `${caseNumber} updated${changes.length > 0 ? ": " + changes.join(", ") : ""}.`,
      });

      return null;
    },
    [setNotice]
  );

  const addColumn = React.useCallback(
    (column: { title: string; helper: string }) => {
      const newColumn: KanbanColumn = {
        id: column.title,
        title: column.title,
        helper: column.helper,
      };
      setColumns((previous) => [...previous, newColumn]);
      setNotice({
        tone: "info",
        message: `Column "${column.title}" added.`,
      });
    },
    [setNotice]
  );

  const editColumn = React.useCallback(
    (id: string, column: { title: string; helper: string }) => {
      setColumns((previous) =>
        previous.map((col) =>
          col.id === id
            ? { ...col, title: column.title, helper: column.helper }
            : col
        )
      );
      setNotice({
        tone: "info",
        message: `Column updated to "${column.title}".`,
      });
    },
    [setNotice]
  );

  const removeColumn = React.useCallback(
    (id: string) => {
      setColumns((previous) => previous.filter((col) => col.id !== id));
      setTasks((previous) => previous.filter((task) => task.status !== id));
      setNotice({
        tone: "info",
        message: `Column removed.`,
      });
    },
    [setNotice]
  );

  return {
    tasks,
    columns,
    setTasks,
    setColumns,
    moveTask,
    addTask,
    removeTask,
    editTask,
    addColumn,
    editColumn,
    removeColumn,
  };
}
