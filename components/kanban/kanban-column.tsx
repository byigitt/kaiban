"use client";

import * as React from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";

import { type KanbanColumn as KanbanColumnType } from "./kanban-board";
import { type KanbanTaskFormState } from "./kanban-task-form";

import { type Task } from "@/lib/gemini-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KanbanColumnEditor } from "./kanban-column-editor";
import { KanbanTaskCard } from "./kanban-task-card";
import { KanbanTaskForm } from "./kanban-task-form";

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  isDropping: boolean;
  isComposing: boolean;
  isEditing: boolean;
  activeForm: KanbanTaskFormState;
  onActiveFormChange: (next: Partial<KanbanTaskFormState>) => void;
  onSubmitNewTask: () => void;
  onCancelNewTask: () => void;
  onStartNewTask: () => void;
  editingColumnValue: { title: string; helper: string };
  onChangeEditingColumn: (next: Partial<{ title: string; helper: string }>) => void;
  onSaveColumn: () => void;
  onCancelColumnEdit: () => void;
  onStartColumnEdit: () => void;
  onRemoveColumn: () => void;
  canRemoveColumn: boolean;
  draggingTask: string | null;
  onDragEnter: () => void;
  onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragStartTask: (
    event: React.DragEvent<HTMLElement>,
    task: Task
  ) => void;
  onDragEndTask: () => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (caseNumber: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function KanbanColumn({
  column,
  tasks,
  isDropping,
  isComposing,
  isEditing,
  activeForm,
  onActiveFormChange,
  onSubmitNewTask,
  onCancelNewTask,
  onStartNewTask,
  editingColumnValue,
  onChangeEditingColumn,
  onSaveColumn,
  onCancelColumnEdit,
  onStartColumnEdit,
  onRemoveColumn,
  canRemoveColumn,
  draggingTask,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onDragStartTask,
  onDragEndTask,
  onEditTask,
  onRemoveTask,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <section
      className={cn(
        "flex min-h-[320px] w-72 flex-col rounded-xl border bg-card/40 p-4 shadow-sm transition-colors",
        isDropping && "border-ring bg-card"
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isEditing ? (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-background/95 p-3">
          <KanbanColumnEditor
            value={editingColumnValue}
            onChange={onChangeEditingColumn}
            onSubmit={onSaveColumn}
            onCancel={onCancelColumnEdit}
            submitLabel="Save"
          />
        </div>
      ) : (
        <header className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {column.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/80">{column.helper}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-xs font-semibold text-muted-foreground",
                isDropping && "border-ring text-foreground"
              )}
            >
              {tasks.length}
            </span>
            <button
              type="button"
              onClick={onStartColumnEdit}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={`Edit ${column.title} column`}
            >
              <FiEdit2 className="size-3.5" aria-hidden="true" />
            </button>
            {canRemoveColumn && (
              <button
                type="button"
                onClick={onRemoveColumn}
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
        {tasks.map((task) => (
          <KanbanTaskCard
            key={task.caseNumber}
            task={task}
            isDragging={draggingTask === task.caseNumber}
            onEdit={onEditTask}
            onRemove={onRemoveTask}
            onDragStart={onDragStartTask}
            onDragEnd={onDragEndTask}
            onClick={onTaskClick}
          />
        ))}

        {tasks.length === 0 ? (
          <div className="grid min-h-[8rem] place-items-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Drop a card here
          </div>
        ) : null}

        {isComposing ? (
          <KanbanTaskForm
            value={activeForm}
            onChange={onActiveFormChange}
            onSubmit={onSubmitNewTask}
            onCancel={onCancelNewTask}
          />
        ) : (
          <Button
            type="button"
            onClick={onStartNewTask}
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
}
