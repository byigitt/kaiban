"use client";

import * as React from "react";
import { FiPlus, FiTrash2, FiX, FiEdit2 } from "react-icons/fi";

import {
  type Task,
  type TaskStatus,
  type TaskPriority,
  TASK_PRIORITY_VALUES,
} from "@/lib/gemini-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    description: string;
    priority: TaskPriority;
  }) => string | null;
  onEditTask: (caseNumber: string, input: {
    newCaseNumber?: string;
    description?: string;
    priority?: TaskPriority;
  }) => Promise<string | null>;
  onRemoveTask: (caseNumber: string) => void;
  onAddColumn: (column: { title: string; helper: string }) => void;
  onEditColumn: (id: string, column: { title: string; helper: string }) => void;
  onRemoveColumn: (id: string) => void;
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
}: KanbanBoardProps) {
  const [hoveredStatus, setHoveredStatus] =
    React.useState<TaskStatus | null>(null);
  const [draggingTask, setDraggingTask] = React.useState<string | null>(null);
  const [activeForm, setActiveForm] = React.useState<{
    status: TaskStatus | null;
    caseNumber: string;
    description: string;
    priority: TaskPriority;
    error: string | null;
  }>({
    status: null,
    caseNumber: "",
    description: "",
    priority: "medium",
    error: null,
  });
  const [editingTask, setEditingTask] = React.useState<{
    caseNumber: string | null;
    newCaseNumber: string;
    description: string;
    priority: TaskPriority;
    error: string | null;
    isSubmitting: boolean;
  }>({
    caseNumber: null,
    newCaseNumber: "",
    description: "",
    priority: "medium",
    error: null,
    isSubmitting: false,
  });
  const [editingColumn, setEditingColumn] = React.useState<{
    id: string | null;
    title: string;
    helper: string;
  }>({
    id: null,
    title: "",
    helper: "",
  });
  const [isAddingColumn, setIsAddingColumn] = React.useState(false);

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    columns.forEach((column) => {
      groups[column.id] = tasks.filter((task) => task.status === column.id);
    });
    return groups;
  }, [tasks, columns]);

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
      const relatedTarget = event.relatedTarget;
      if (
        !relatedTarget ||
        !(relatedTarget instanceof Node) ||
        !event.currentTarget.contains(relatedTarget)
      ) {
        setHoveredStatus((current) => (current === status ? null : current));
      }
    },
    []
  );

  return (
    <div className="flex w-max gap-4 pb-2">
      {columns.map((column) => {
        const columnTasks = groupedTasks[column.id] || [];
        const isDropping = hoveredStatus === column.id;
        const isComposing = activeForm.status === column.id;
        const isEditing = editingColumn.id === column.id;

        return (
          <section
            key={column.id}
            className={cn(
              "flex min-h-[320px] w-72 flex-col rounded-xl border bg-card/40 p-4 shadow-sm transition-colors",
              isDropping && "border-ring bg-card"
            )}
            onDragEnter={() => setHoveredStatus(column.id)}
            onDragLeave={(event) => handleDragLeave(event, column.id)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              setHoveredStatus(null);
              const caseNumber = event.dataTransfer.getData("text/plain");
              if (caseNumber) {
                onMoveTask(caseNumber, column.id);
              }
              setDraggingTask(null);
            }}
          >
            {isEditing ? (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-background/95 p-3">
                <Input
                  value={editingColumn.title}
                  onChange={(event) =>
                    setEditingColumn((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Column name"
                  aria-label="Column title"
                />
                <Textarea
                  value={editingColumn.helper}
                  onChange={(event) =>
                    setEditingColumn((prev) => ({
                      ...prev,
                      helper: event.target.value,
                    }))
                  }
                  placeholder="Description"
                  rows={2}
                  aria-label="Column description"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (editingColumn.title.trim()) {
                        onEditColumn(column.id, {
                          title: editingColumn.title.trim(),
                          helper: editingColumn.helper.trim(),
                        });
                      }
                      setEditingColumn({ id: null, title: "", helper: "" });
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEditingColumn({ id: null, title: "", helper: "" })
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <header className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {column.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground/80">
                    {column.helper}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-1 text-xs font-semibold text-muted-foreground",
                      isDropping && "border-ring text-foreground"
                    )}
                  >
                    {columnTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingColumn({
                        id: column.id,
                        title: column.title,
                        helper: column.helper,
                      })
                    }
                    className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${column.title} column`}
                  >
                    <FiEdit2 className="size-3.5" aria-hidden="true" />
                  </button>
                  {columns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          columnTasks.length === 0 ||
                          confirm(
                            `Delete "${column.title}"? All tasks in this column will be removed.`
                          )
                        ) {
                          onRemoveColumn(column.id);
                        }
                      }}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${column.title} column`}
                    >
                      <FiTrash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </header>
            )}
            <div className="mt-4 flex flex-1 flex-col gap-3">
              {columnTasks.map((task) => {
                const isDragging = draggingTask === task.caseNumber;
                return (
                  <article
                    key={task.caseNumber}
                    draggable
                    onDragStart={(event) => {
                      setDraggingTask(task.caseNumber);
                      event.dataTransfer.setData("text/plain", task.caseNumber);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingTask(null);
                      setHoveredStatus(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-lg border bg-background/95 p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing",
                      isDragging && "opacity-70 ring-2 ring-ring"
                    )}
                  >
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {task.caseNumber}
                        </p>
                        <span
                          className={cn(
                            "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            task.priority === "high" &&
                              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                            task.priority === "medium" &&
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                            task.priority === "low" &&
                              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setEditingTask({
                              caseNumber: task.caseNumber,
                              newCaseNumber: task.caseNumber,
                              description: task.description,
                              priority: task.priority,
                              error: null,
                              isSubmitting: false,
                            });
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                          }}
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={`Edit ${task.caseNumber}`}
                        >
                          <FiEdit2 className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onRemoveTask(task.caseNumber);
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                          }}
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${task.caseNumber}`}
                        >
                          <FiTrash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </header>
                    <p className="mt-2 text-sm leading-5 text-foreground">
                      {task.description}
                    </p>
                  </article>
                );
              })}

              {columnTasks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Drop a card here
                </div>
              ) : null}

              {isComposing ? (
                <form
                  className="flex flex-col gap-2 rounded-lg border bg-background/95 p-3 shadow-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!activeForm.caseNumber.trim()) {
                      setActiveForm((previous) => ({
                        ...previous,
                        error: "Case number is required.",
                      }));
                      return;
                    }
                    if (!activeForm.description.trim()) {
                      setActiveForm((previous) => ({
                        ...previous,
                        error: "Description is required.",
                      }));
                      return;
                    }
                    const message = onAddTask({
                      status: column.id,
                      caseNumber: activeForm.caseNumber.trim(),
                      description: activeForm.description.trim(),
                      priority: activeForm.priority,
                    });
                    if (message) {
                      setActiveForm((previous) => ({
                        ...previous,
                        error: message,
                      }));
                      return;
                    }
                    setActiveForm({
                      status: null,
                      caseNumber: "",
                      description: "",
                      priority: "medium",
                      error: null,
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Add task
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveForm({
                          status: null,
                          caseNumber: "",
                          description: "",
                          priority: "medium",
                          error: null,
                        })
                      }
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Cancel new task"
                    >
                      <FiX className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <Input
                    value={activeForm.caseNumber}
                    onChange={(event) =>
                      setActiveForm((previous) => ({
                        ...previous,
                        caseNumber: event.target.value.toUpperCase(),
                        error: null,
                      }))
                    }
                    placeholder="CASE-101"
                    aria-label="Task case number"
                  />
                  <Textarea
                    value={activeForm.description}
                    onChange={(event) =>
                      setActiveForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                        error: null,
                      }))
                    }
                    placeholder="Describe the work"
                    rows={3}
                    aria-label="Task description"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {TASK_PRIORITY_VALUES.map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() =>
                            setActiveForm((previous) => ({
                              ...previous,
                              priority,
                            }))
                          }
                          className={cn(
                            "flex-1 rounded-md border px-3 py-2 text-xs font-medium capitalize transition",
                            activeForm.priority === priority
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activeForm.error ? (
                    <p className="text-xs font-medium text-destructive">
                      {activeForm.error}
                    </p>
                  ) : null}
                  <Button
                    size="sm"
                    type="submit"
                    className="inline-flex items-center gap-2"
                  >
                    <FiPlus className="size-3.5" aria-hidden="true" />
                    <span>Add to column</span>
                  </Button>
                </form>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setActiveForm({
                      status: column.id,
                      caseNumber: "",
                      description: "",
                      priority: "medium",
                      error: null,
                    })
                  }
                  variant="ghost"
                  size="sm"
                  className="mt-auto inline-flex items-center justify-center gap-2"
                >
                  <FiPlus className="size-4" aria-hidden="true" />
                  <span>Add task</span>
                </Button>
              )}
            </div>
          </section>
        );
      })}

      {isAddingColumn ? (
        <section className="flex min-h-[320px] w-72 flex-col rounded-xl border bg-card/40 p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <Input
              value={editingColumn.title}
              onChange={(event) =>
                setEditingColumn((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              placeholder="Column name"
              aria-label="New column title"
              autoFocus
            />
            <Textarea
              value={editingColumn.helper}
              onChange={(event) =>
                setEditingColumn((prev) => ({
                  ...prev,
                  helper: event.target.value,
                }))
              }
              placeholder="Description"
              rows={2}
              aria-label="New column description"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (editingColumn.title.trim()) {
                    onAddColumn({
                      title: editingColumn.title.trim(),
                      helper: editingColumn.helper.trim(),
                    });
                    setEditingColumn({ id: null, title: "", helper: "" });
                    setIsAddingColumn(false);
                  }
                }}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingColumn({ id: null, title: "", helper: "" });
                  setIsAddingColumn(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-[320px] w-72 items-center justify-center rounded-xl border border-dashed bg-card/20 p-4">
          <Button
            type="button"
            onClick={() => setIsAddingColumn(true)}
            variant="ghost"
            size="lg"
            className="flex flex-col items-center gap-2"
          >
            <FiPlus className="size-6" aria-hidden="true" />
            <span>Add column</span>
          </Button>
        </section>
      )}

      <Dialog
        open={editingTask.caseNumber !== null}
        onOpenChange={(open) => {
          if (!open && !editingTask.isSubmitting) {
            setEditingTask({
              caseNumber: null,
              newCaseNumber: "",
              description: "",
              priority: "medium",
              error: null,
              isSubmitting: false,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <FiEdit2 className="size-5 text-primary" aria-hidden="true" />
              </div>
              Edit Task
            </DialogTitle>
            <DialogDescription>
              Update the task details below
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editingTask.newCaseNumber.trim()) {
                setEditingTask((prev) => ({
                  ...prev,
                  error: "Case number is required.",
                }));
                return;
              }
              if (!editingTask.description.trim()) {
                setEditingTask((prev) => ({
                  ...prev,
                  error: "Description is required.",
                }));
                return;
              }

              setEditingTask((prev) => ({ ...prev, isSubmitting: true }));

              const updates: {
                newCaseNumber?: string;
                description?: string;
                priority?: TaskPriority;
              } = {};

              if (editingTask.newCaseNumber !== editingTask.caseNumber) {
                updates.newCaseNumber = editingTask.newCaseNumber.trim();
              }
              const originalTask = tasks.find(
                (t) => t.caseNumber === editingTask.caseNumber
              );
              if (
                originalTask &&
                editingTask.description.trim() !== originalTask.description
              ) {
                updates.description = editingTask.description.trim();
              }
              if (originalTask && editingTask.priority !== originalTask.priority) {
                updates.priority = editingTask.priority;
              }

              if (Object.keys(updates).length === 0) {
                setEditingTask({
                  caseNumber: null,
                  newCaseNumber: "",
                  description: "",
                  priority: "medium",
                  error: null,
                  isSubmitting: false,
                });
                return;
              }

              const error = await onEditTask(editingTask.caseNumber!, updates);
              if (error) {
                setEditingTask((prev) => ({
                  ...prev,
                  error,
                  isSubmitting: false,
                }));
              } else {
                setEditingTask({
                  caseNumber: null,
                  newCaseNumber: "",
                  description: "",
                  priority: "medium",
                  error: null,
                  isSubmitting: false,
                });
              }
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-case-number" className="text-sm font-medium">
                  Case Number
                </label>
                <Input
                  id="edit-case-number"
                  value={editingTask.newCaseNumber}
                  onChange={(event) =>
                    setEditingTask((prev) => ({
                      ...prev,
                      newCaseNumber: event.target.value.toUpperCase(),
                      error: null,
                    }))
                  }
                  disabled={editingTask.isSubmitting}
                  placeholder="TASK-101"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="edit-description"
                  value={editingTask.description}
                  onChange={(event) =>
                    setEditingTask((prev) => ({
                      ...prev,
                      description: event.target.value,
                      error: null,
                    }))
                  }
                  disabled={editingTask.isSubmitting}
                  placeholder="Describe the work"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <div className="flex gap-2">
                  {TASK_PRIORITY_VALUES.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      disabled={editingTask.isSubmitting}
                      onClick={() =>
                        setEditingTask((prev) => ({
                          ...prev,
                          priority,
                        }))
                      }
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-xs font-medium capitalize transition",
                        editingTask.priority === priority
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                        editingTask.isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              {editingTask.error && (
                <p className="text-sm font-medium text-destructive">
                  {editingTask.error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditingTask({
                    caseNumber: null,
                    newCaseNumber: "",
                    description: "",
                    priority: "medium",
                    error: null,
                    isSubmitting: false,
                  })
                }
                disabled={editingTask.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editingTask.isSubmitting}
                className="gap-2"
              >
                {editingTask.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
