"use client";

import * as React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { type Task } from "@/lib/gemini-contract";
import { cn } from "@/lib/utils";

interface KanbanTaskCardProps {
  task: Task;
  isDragging: boolean;
  onEdit: (task: Task) => void;
  onRemove: (caseNumber: string) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>, task: Task) => void;
  onDragEnd: () => void;
  onClick?: (task: Task) => void;
}

export function KanbanTaskCard({
  task,
  isDragging,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnd,
  onClick,
}: KanbanTaskCardProps) {
  return (
    <article
      key={task.caseNumber}
      draggable
      onDragStart={(event) => onDragStart(event, task)}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (onClick) {
          onClick(task);
        }
      }}
      className={cn(
        "cursor-pointer rounded-lg border bg-background/95 p-3 shadow-sm transition hover:shadow-md hover:border-ring",
        isDragging && "opacity-70 ring-2 ring-ring"
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            {task.caseNumber}
          </p>
          <h4 className="text-sm font-semibold leading-tight text-foreground">
            {task.title}
          </h4>
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
              onEdit(task);
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
              onRemove(task.caseNumber);
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
    </article>
  );
}
