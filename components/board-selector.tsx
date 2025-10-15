"use client";

import * as React from "react";
import { FiPlus, FiChevronDown, FiLayers, FiCheck, FiEdit2, FiTrash2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Board {
  id: string;
  name: string;
  taskCount: number;
}

interface BoardSelectorProps {
  boards: Board[];
  activeBoard: Board | null;
  onSelectBoard: (board: Board) => void;
  onCreateBoard: (name: string) => Promise<void>;
  onEditBoard: (id: string, name: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
}

export function BoardSelector({
  boards,
  activeBoard,
  onSelectBoard,
  onCreateBoard,
  onEditBoard,
  onDeleteBoard,
}: BoardSelectorProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newBoardName, setNewBoardName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingBoard, setEditingBoard] = React.useState<{
    id: string | null;
    name: string;
    isSubmitting: boolean;
  }>({
    id: null,
    name: "",
    isSubmitting: false,
  });
  const [deletingBoard, setDeletingBoard] = React.useState<{
    id: string | null;
    name: string;
    taskCount: number;
    isSubmitting: boolean;
  }>({
    id: null,
    name: "",
    taskCount: 0,
    isSubmitting: false,
  });

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newBoardName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateBoard(newBoardName.trim());
      setNewBoardName("");
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Failed to create board:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 font-medium">
          <FiLayers className="size-4" aria-hidden="true" />
          <span className="max-w-[150px] truncate">
            {activeBoard?.name || "Select Board"}
          </span>
          <FiChevronDown className="size-4 opacity-50" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[360px] px-0">
        <SheetHeader className="px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FiLayers className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <SheetTitle className="text-xl">Boards</SheetTitle>
              <SheetDescription className="text-xs">
                Organize tasks by project
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col gap-3 px-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {boards.length} {boards.length === 1 ? "board" : "boards"}
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            {boards.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
                <FiLayers className="mb-3 size-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  No boards yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Create your first board to get started
                </p>
              </div>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  className={`group relative flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3.5 transition-all ${
                    activeBoard?.id === board.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => onSelectBoard(board)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                        activeBoard?.id === board.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <FiLayers className="size-4" aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-semibold leading-none">
                        {board.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {board.taskCount} {board.taskCount === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeBoard?.id === board.id && (
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <FiCheck className="size-3.5" aria-hidden="true" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingBoard({
                          id: board.id,
                          name: board.name,
                          isSubmitting: false,
                        });
                      }}
                      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${board.name}`}
                    >
                      <FiEdit2 className="size-3.5" aria-hidden="true" />
                    </button>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingBoard({
                            id: board.id,
                            name: board.name,
                            taskCount: board.taskCount,
                            isSubmitting: false,
                          });
                        }}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${board.name}`}
                      >
                        <FiTrash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="mt-2 w-full gap-2 shadow-sm">
                <FiPlus className="size-4" aria-hidden="true" />
                <span>Create New Board</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <FiLayers className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  Create New Board
                </DialogTitle>
                <DialogDescription>
                  Give your board a name to organize your tasks
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="board-name" className="text-sm font-medium">
                      Board Name
                    </label>
                    <Input
                      id="board-name"
                      value={newBoardName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewBoardName(e.target.value)
                      }
                      placeholder="e.g., Marketing Campaign, Web Redesign"
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setNewBoardName("");
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || !newBoardName.trim()}
                    className="gap-2"
                  >
                    {isCreating ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <FiPlus className="size-4" aria-hidden="true" />
                        Create Board
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </SheetContent>

      <Dialog
        open={editingBoard.id !== null}
        onOpenChange={(open) => {
          if (!open && !editingBoard.isSubmitting) {
            setEditingBoard({
              id: null,
              name: "",
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
              Edit Board
            </DialogTitle>
            <DialogDescription>
              Update the board name below
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editingBoard.name.trim()) {
                return;
              }

              setEditingBoard((prev) => ({ ...prev, isSubmitting: true }));
              await onEditBoard(editingBoard.id!, editingBoard.name.trim());
              setEditingBoard({
                id: null,
                name: "",
                isSubmitting: false,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-board-name" className="text-sm font-medium">
                  Board Name
                </label>
                <Input
                  id="edit-board-name"
                  value={editingBoard.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingBoard((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g., Marketing Campaign, Web Redesign"
                  disabled={editingBoard.isSubmitting}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingBoard({
                    id: null,
                    name: "",
                    isSubmitting: false,
                  });
                }}
                disabled={editingBoard.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editingBoard.isSubmitting || !editingBoard.name.trim()}
                className="gap-2"
              >
                {editingBoard.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingBoard.id !== null}
        onOpenChange={(open) => {
          if (!open && !deletingBoard.isSubmitting) {
            setDeletingBoard({
              id: null,
              name: "",
              taskCount: 0,
              isSubmitting: false,
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingBoard.name}&quot;?
              {deletingBoard.taskCount > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  This will permanently delete {deletingBoard.taskCount}{" "}
                  {deletingBoard.taskCount === 1 ? "task" : "tasks"}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingBoard.isSubmitting}
              onClick={() => {
                setDeletingBoard({
                  id: null,
                  name: "",
                  taskCount: 0,
                  isSubmitting: false,
                });
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingBoard.isSubmitting}
              onClick={async () => {
                setDeletingBoard((prev) => ({ ...prev, isSubmitting: true }));
                await onDeleteBoard(deletingBoard.id!);
                setDeletingBoard({
                  id: null,
                  name: "",
                  taskCount: 0,
                  isSubmitting: false,
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBoard.isSubmitting ? "Deleting..." : "Delete Board"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
