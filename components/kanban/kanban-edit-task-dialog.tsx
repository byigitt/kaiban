"use client";

import * as React from "react";
import { FiEdit2 } from "react-icons/fi";

import { TASK_PRIORITY_VALUES, type TaskPriority } from "@/lib/gemini-contract";
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

export interface EditingTaskState {
  caseNumber: string | null;
  newCaseNumber: string;
  title: string;
  description: string;
  priority: TaskPriority;
  error: string | null;
  isSubmitting: boolean;
}

interface KanbanEditTaskDialogProps {
  editingTask: EditingTaskState;
  onClose: () => void;
  onChange: (next: Partial<EditingTaskState>) => void;
  onSubmit: () => Promise<void>;
}

export function KanbanEditTaskDialog({
  editingTask,
  onClose,
  onChange,
  onSubmit,
}: KanbanEditTaskDialogProps) {
  return (
    <Dialog
      open={editingTask.caseNumber !== null}
      onOpenChange={(open) => {
        if (!open && !editingTask.isSubmitting) {
          onClose();
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
          <DialogDescription>Update the task details below</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit();
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
                  onChange({ newCaseNumber: event.target.value.toUpperCase(), error: null })
                }
                disabled={editingTask.isSubmitting}
                placeholder="TASK-101"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="edit-title"
                value={editingTask.title}
                onChange={(event) => onChange({ title: event.target.value, error: null })}
                disabled={editingTask.isSubmitting}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={editingTask.description}
                onChange={(event) => onChange({ description: event.target.value, error: null })}
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
                    onClick={() => onChange({ priority })}
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
              <p className="text-sm font-medium text-destructive">{editingTask.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={editingTask.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={editingTask.isSubmitting} className="gap-2">
              {editingTask.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
