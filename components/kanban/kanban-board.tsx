"use client";

import * as React from "react";
import { FiPlus } from "react-icons/fi";

import { type Task, type TaskStatus, type TaskPriority } from "@/lib/gemini-contract";
import { Button } from "@/components/ui/button";

import { KanbanColumn as KanbanColumnSection } from "./kanban-column";
import { KanbanColumnEditor } from "./kanban-column-editor";
import {
  KanbanEditTaskDialog,
  type EditingTaskState,
} from "./kanban-edit-task-dialog";
import { type KanbanTaskFormState } from "./kanban-task-form";

interface ActiveFormState extends KanbanTaskFormState {
  status: TaskStatus | null;
}

const createEmptyTaskForm = (): ActiveFormState => ({
  status: null,
  caseNumber: "",
  title: "",
  description: "",
  priority: "medium",
  error: null,
});

const createEmptyEditingTask = (): EditingTaskState => ({
  caseNumber: null,
  newCaseNumber: "",
  title: "",
  description: "",
  priority: "medium",
  error: null,
  isSubmitting: false,
});

const createEmptyEditingColumn = () => ({
  id: null as string | null,
  title: "",
  helper: "",
});

export interface KanbanColumn {
  id: string;
  title: string;
  helper: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  columns: KanbanColumn[];
  onMoveTask: (caseNumber: string, nextStatus: TaskStatus) => void;
  onAddTask: (input: {
    status: TaskStatus;
    caseNumber: string;
    title: string;
    description: string;
    priority: TaskPriority;
  }) => string | null;
  onEditTask: (caseNumber: string, input: {
    newCaseNumber?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
  }) => Promise<string | null>;
  onRemoveTask: (caseNumber: string) => void;
  onAddColumn: (column: { title: string; helper: string }) => void;
  onEditColumn: (id: string, column: { title: string; helper: string }) => void;
  onRemoveColumn: (id: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({
  tasks,
  columns,
  onMoveTask,
  onAddTask,
  onEditTask,
  onRemoveTask,
  onAddColumn,
  onEditColumn,
  onRemoveColumn,
  onTaskClick,
}: KanbanBoardProps) {
  const [hoveredStatus, setHoveredStatus] = React.useState<TaskStatus | null>(null);
  const [draggingTask, setDraggingTask] = React.useState<string | null>(null);
  const [activeForm, setActiveForm] = React.useState<ActiveFormState>(() => createEmptyTaskForm());
  const [editingTask, setEditingTask] = React.useState<EditingTaskState>(() => createEmptyEditingTask());
  const [editingColumn, setEditingColumn] = React.useState<{
    id: string | null;
    title: string;
    helper: string;
  }>(() => createEmptyEditingColumn());
  const [isAddingColumn, setIsAddingColumn] = React.useState(false);

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    columns.forEach((column) => {
      groups[column.id] = tasks.filter((task) => task.status === column.id);
    });
    return groups;
  }, [tasks, columns]);

  const resetActiveForm = React.useCallback(() => {
    setActiveForm(createEmptyTaskForm());
  }, []);

  const resetEditingTask = React.useCallback(() => {
    setEditingTask(createEmptyEditingTask());
  }, []);

  const resetEditingColumn = React.useCallback(() => {
    setEditingColumn(createEmptyEditingColumn());
  }, []);

  const handleDragLeave = React.useCallback((event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    const relatedTarget = event.relatedTarget;
    if (!relatedTarget || !(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setHoveredStatus((current) => (current === status ? null : current));
    }
  }, []);

  const handleSubmitNewTask = React.useCallback(
    (status: TaskStatus) => {
      if (!activeForm.caseNumber.trim()) {
        setActiveForm((previous) => ({ ...previous, error: "Case number is required." }));
        return;
      }
      if (!activeForm.title.trim()) {
        setActiveForm((previous) => ({ ...previous, error: "Title is required." }));
        return;
      }
      if (!activeForm.description.trim()) {
        setActiveForm((previous) => ({ ...previous, error: "Description is required." }));
        return;
      }

      const message = onAddTask({
        status,
        caseNumber: activeForm.caseNumber.trim(),
        title: activeForm.title.trim(),
        description: activeForm.description.trim(),
        priority: activeForm.priority,
      });

      if (message) {
        setActiveForm((previous) => ({ ...previous, error: message }));
        return;
      }

      resetActiveForm();
    },
    [activeForm, onAddTask, resetActiveForm]
  );

  const handleDragStartTask = React.useCallback(
    (event: React.DragEvent<HTMLElement>, task: Task) => {
      setDraggingTask(task.caseNumber);
      event.dataTransfer.setData("text/plain", task.caseNumber);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragEndTask = React.useCallback(() => {
    setDraggingTask(null);
    setHoveredStatus(null);
  }, []);

  const handleRequestEditTask = React.useCallback((task: Task) => {
    setEditingTask({
      caseNumber: task.caseNumber,
      newCaseNumber: task.caseNumber,
      title: task.title,
      description: task.description,
      priority: task.priority,
      error: null,
      isSubmitting: false,
    });
  }, []);

  const handleRemoveColumn = React.useCallback(
    (columnId: string, columnTitle: string, count: number) => {
      if (
        count === 0 ||
        confirm(`Delete "${columnTitle}"? All tasks in this column will be removed.`)
      ) {
        onRemoveColumn(columnId);
      }
    },
    [onRemoveColumn]
  );

  const handleSubmitTaskEdits = React.useCallback(async () => {
    if (!editingTask.caseNumber) {
      return;
    }

    if (!editingTask.newCaseNumber.trim()) {
      setEditingTask((prev) => ({ ...prev, error: "Case number is required." }));
      return;
    }
    if (!editingTask.title.trim()) {
      setEditingTask((prev) => ({ ...prev, error: "Title is required." }));
      return;
    }
    if (!editingTask.description.trim()) {
      setEditingTask((prev) => ({ ...prev, error: "Description is required." }));
      return;
    }

    setEditingTask((prev) => ({ ...prev, isSubmitting: true }));

    const updates: {
      newCaseNumber?: string;
      title?: string;
      description?: string;
      priority?: TaskPriority;
    } = {};

    if (editingTask.newCaseNumber !== editingTask.caseNumber) {
      updates.newCaseNumber = editingTask.newCaseNumber.trim();
    }

    const originalTask = tasks.find((task) => task.caseNumber === editingTask.caseNumber);
    if (originalTask && editingTask.title.trim() !== originalTask.title) {
      updates.title = editingTask.title.trim();
    }
    if (originalTask && editingTask.description.trim() !== originalTask.description) {
      updates.description = editingTask.description.trim();
    }
    if (originalTask && editingTask.priority !== originalTask.priority) {
      updates.priority = editingTask.priority;
    }

    if (Object.keys(updates).length === 0) {
      resetEditingTask();
      return;
    }

    const error = await onEditTask(editingTask.caseNumber, updates);
    if (error) {
      setEditingTask((prev) => ({ ...prev, error, isSubmitting: false }));
      return;
    }

    resetEditingTask();
  }, [editingTask, onEditTask, resetEditingTask, tasks]);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
      event.preventDefault();
      setHoveredStatus(null);
      const caseNumber = event.dataTransfer.getData("text/plain");
      if (caseNumber) {
        onMoveTask(caseNumber, status);
      }
      setDraggingTask(null);
    },
    [onMoveTask]
  );

  return (
    <div className="flex w-max gap-4 pb-2">
      {columns.map((column) => {
        const columnTasks = groupedTasks[column.id] || [];
        const isDropping = hoveredStatus === column.id;
        const isComposing = activeForm.status === column.id;
        const isEditing = editingColumn.id === column.id;

        return (
          <KanbanColumnSection
            key={column.id}
            column={column}
            tasks={columnTasks}
            isDropping={isDropping}
            isComposing={isComposing}
            isEditing={isEditing}
            activeForm={activeForm}
            onActiveFormChange={(next) =>
              setActiveForm((previous) => ({ ...previous, ...next }))
            }
            onSubmitNewTask={() => handleSubmitNewTask(column.id)}
            onCancelNewTask={resetActiveForm}
            onStartNewTask={() =>
              setActiveForm({ ...createEmptyTaskForm(), status: column.id })
            }
            editingColumnValue={{ title: editingColumn.title, helper: editingColumn.helper }}
            onChangeEditingColumn={(next) =>
              setEditingColumn((prev) => ({ ...prev, ...next }))
            }
            onSaveColumn={() => {
              if (!editingColumn.title.trim()) {
                return;
              }
              onEditColumn(column.id, {
                title: editingColumn.title.trim(),
                helper: editingColumn.helper.trim(),
              });
              resetEditingColumn();
            }}
            onCancelColumnEdit={resetEditingColumn}
            onStartColumnEdit={() =>
              setEditingColumn({
                id: column.id,
                title: column.title,
                helper: column.helper,
              })
            }
            onRemoveColumn={() =>
              handleRemoveColumn(column.id, column.title, columnTasks.length)
            }
            canRemoveColumn={columns.length > 1}
            draggingTask={draggingTask}
            onDragEnter={() => setHoveredStatus(column.id)}
            onDragLeave={(event) => handleDragLeave(event, column.id)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => handleDrop(event, column.id)}
            onDragStartTask={handleDragStartTask}
            onDragEndTask={handleDragEndTask}
            onEditTask={handleRequestEditTask}
            onRemoveTask={onRemoveTask}
            onTaskClick={onTaskClick}
          />
        );
      })}

      {isAddingColumn ? (
        <section className="flex min-h-[320px] w-72 flex-col rounded-xl border bg-card/40 p-4 shadow-sm">
          <KanbanColumnEditor
            value={{ title: editingColumn.title, helper: editingColumn.helper }}
            onChange={(next) => setEditingColumn((prev) => ({ ...prev, ...next }))}
            onSubmit={() => {
              if (!editingColumn.title.trim()) {
                return;
              }
              onAddColumn({
                title: editingColumn.title.trim(),
                helper: editingColumn.helper.trim(),
              });
              resetEditingColumn();
              setIsAddingColumn(false);
            }}
            onCancel={() => {
              resetEditingColumn();
              setIsAddingColumn(false);
            }}
            submitLabel="Add"
          />
        </section>
      ) : (
        <section className="flex min-h-[320px] w-72 items-center justify-center rounded-xl border border-dashed bg-card/20 p-4">
          <Button
            type="button"
            onClick={() => {
              resetEditingColumn();
              setIsAddingColumn(true);
            }}
            variant="ghost"
            size="lg"
            className="flex flex-col items-center gap-2"
          >
            <FiPlus className="size-6" aria-hidden="true" />
            <span>Add column</span>
          </Button>
        </section>
      )}
      <KanbanEditTaskDialog
        editingTask={editingTask}
        onClose={resetEditingTask}
        onChange={(next) => setEditingTask((prev) => ({ ...prev, ...next }))}
        onSubmit={handleSubmitTaskEdits}
      />
    </div>
  );
}
