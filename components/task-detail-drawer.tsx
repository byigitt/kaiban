"use client";

import * as React from "react";
import { FiTrash2, FiX } from "react-icons/fi";

import { type Task } from "@/lib/gemini-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (caseNumber: string) => void;
  chatWidth?: number;
}

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onDelete,
  chatWidth = 480,
}: TaskDetailDrawerProps) {
  if (!task) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent 
        style={{ 
          marginRight: `${chatWidth}px`,
          maxHeight: '50vh'
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <button
                type="button"
                className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close drawer"
              >
                <FiX className="size-4" aria-hidden="true" />
              </button>
            </DrawerClose>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <DrawerTitle className="text-2xl">{task.title}</DrawerTitle>
                <DrawerDescription className="mt-2 text-base">
                  {task.caseNumber}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(50vh - 200px)' }}>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h3>
              <p className="text-base">{task.status}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Priority
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize",
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
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {task.description}
              </p>
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete ${task.caseNumber}?`
                    )
                  ) {
                    onDelete(task.caseNumber);
                    onOpenChange(false);
                  }
                }}
                variant="outline"
                className="gap-2"
              >
                <FiTrash2 className="size-4" aria-hidden="true" />
                <span>Delete Task</span>
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
