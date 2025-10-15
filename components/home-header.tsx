import { FiTrash2 } from "react-icons/fi";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { BoardSelector } from "@/components/board-selector";
import { GEMINI_PROMPT_VERSION } from "@/lib/gemini-contract";
import type { Board } from "@/lib/types/board-types";

interface HomeHeaderProps {
  boards: Board[];
  activeBoard: Board | null;
  taskCount: number;
  hasTasks: boolean;
  disabled: boolean;
  onSelectBoard: (board: Board) => void;
  onCreateBoard: (name: string) => Promise<void>;
  onEditBoard: (id: string, name: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
  onClearBoard: () => void;
}

export function HomeHeader({
  boards,
  activeBoard,
  taskCount,
  hasTasks,
  disabled,
  onSelectBoard,
  onCreateBoard,
  onEditBoard,
  onDeleteBoard,
  onClearBoard,
}: HomeHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b px-8 py-6">
      <div className="flex items-center gap-3">
        <AppIcon size={32} aria-label="Kaiban icon" className="size-12 shrink-0" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">
            Kaiban task board
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag, drop, or add work manually while Gemini keeps tasks in sync.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <BoardSelector
          boards={boards}
          activeBoard={activeBoard}
          onSelectBoard={onSelectBoard}
          onCreateBoard={onCreateBoard}
          onEditBoard={onEditBoard}
          onDeleteBoard={onDeleteBoard}
        />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {taskCount} task{taskCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden="true">•</span>
          <span>Prompt version {GEMINI_PROMPT_VERSION}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClearBoard}
          disabled={!hasTasks || disabled}
        >
          <FiTrash2 className="size-4" aria-hidden="true" />
          <span>Clear board</span>
        </Button>
      </div>
    </header>
  );
}
