"use client";

import * as React from "react";
import { FiPlus, FiX } from "react-icons/fi";

import { TASK_PRIORITY_VALUES, type TaskPriority } from "@/lib/gemini-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface KanbanTaskFormState {
  caseNumber: string;
  title: string;
  description: string;
  priority: TaskPriority;
  error: string | null;
}

interface KanbanTaskFormProps {
  value: KanbanTaskFormState;
  onChange: (next: Partial<KanbanTaskFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function KanbanTaskForm({ value, onChange, onSubmit, onCancel }: KanbanTaskFormProps) {
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border bg-background/95 p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add task
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Cancel new task"
        >
          <FiX className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <Input
        value={value.caseNumber}
        onChange={(event) => onChange({ caseNumber: event.target.value.toUpperCase(), error: null })}
        placeholder="CASE-101"
        aria-label="Task case number"
      />
      <Input
        value={value.title}
        onChange={(event) => onChange({ title: event.target.value, error: null })}
        placeholder="Task title"
        aria-label="Task title"
      />
      <Textarea
        value={value.description}
        onChange={(event) => onChange({ description: event.target.value, error: null })}
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
              onClick={() => onChange({ priority })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-xs font-medium capitalize transition",
                value.priority === priority
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>
      {value.error ? (
        <p className="text-xs font-medium text-destructive">{value.error}</p>
      ) : null}
      <Button size="sm" type="submit" className="inline-flex items-center gap-2">
        <FiPlus className="size-3.5" aria-hidden="true" />
        <span>Add to column</span>
      </Button>
    </form>
  );
}
