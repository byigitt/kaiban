import type { Task, TaskStatus } from "@/lib/gemini-contract";
import type { KanbanColumn } from "@/components/kanban/kanban-board";

export interface BoardData {
  id: string;
  name: string;
  title: string;
  taskCount: number;
  columns: KanbanColumn[];
}

export interface Board {
  id: string;
  name: string;
  taskCount: number;
}

export interface CreateBoardResponse {
  tasks: Task[];
  conversationId: string;
  boardId: string | null;
}

export interface ChatResponse {
  action: "update_status" | "delete" | "update_properties" | "create_board" | "update_board" | "delete_board" | "create_column" | "update_column" | "delete_column";
  caseNumber?: string;
  newStatus?: TaskStatus;
  newCaseNumber?: string;
  newTitle?: string;
  newDescription?: string;
  newPriority?: string;
  board?: {
    id: string;
    name: string;
    columns: Array<{
      id: string;
      title: string;
      helper: string | null;
      order: number;
    }>;
  };
  boardId?: string;
  column?: {
    id: string;
    title: string;
    helper: string | null;
    order: number;
  };
  columnTitle?: string;
}

export type NoticeTone = "info" | "error";

export interface Notice {
  tone: NoticeTone;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
