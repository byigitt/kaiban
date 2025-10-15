import * as React from "react";
import type { Task } from "@/lib/gemini-contract";
import type { Board, BoardData, Notice } from "@/lib/types/board-types";
import type { KanbanColumn } from "@/components/kanban/kanban-board";
import { postJson } from "@/lib/api/client";

interface UseBoardManagerProps {
  setNotice: (notice: Notice | null) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>>>;
  INITIAL_AI_MESSAGE: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  };
}

export function useBoardManager({
  setNotice,
  setTasks,
  setColumns,
  setConversationId,
  setMessages,
  INITIAL_AI_MESSAGE,
}: UseBoardManagerProps) {
  const [boards, setBoards] = React.useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = React.useState<Board | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async (boardId?: string | null) => {
    try {
      const url = boardId ? `/api/data?boardId=${boardId}` : "/api/data";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load data");
      }
      const data = await response.json();

      if (data.boards && data.boards.length > 0) {
        const boardsData: BoardData[] = data.boards;
        setBoards(boardsData.map((b) => ({
          id: b.id,
          name: b.name,
          taskCount: b.taskCount,
        })));

        const savedBoardId = localStorage.getItem("activeBoardId");
        const targetBoard = savedBoardId
          ? boardsData.find((b) => b.id === savedBoardId)
          : boardsData[0];

        if (targetBoard && targetBoard.columns.length > 0) {
          setActiveBoard({
            id: targetBoard.id,
            name: targetBoard.name,
            taskCount: targetBoard.taskCount,
          });
          setColumns(targetBoard.columns.map((col: { id: string; title: string; helper: string | null }) => ({
            id: col.title,
            title: col.title,
            helper: col.helper ?? "",
          })));
        }
      }

      if (data.conversations && data.conversations.length > 0) {
        const latestConversation = data.conversations[0];
        setConversationId(latestConversation.id);

        if (latestConversation.messages && latestConversation.messages.length > 0) {
          const conversationMessages = latestConversation.messages.map(
            (msg: { id: string; role: string; content: string; createdAt: string }) => ({
              id: msg.id,
              role: msg.role.toLowerCase() as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.createdAt),
            })
          );
          setMessages([INITIAL_AI_MESSAGE, ...conversationMessages]);
        }
      }

      if (data.tasks && data.tasks.length > 0) {
        const loadedTasks: Task[] = data.tasks.map(
          (task: { caseNumber: string; title: string | null; body: string; status: string; priority: string }) => ({
            caseNumber: task.caseNumber,
            title: task.title || task.caseNumber,
            description: task.body,
            status: task.status,
            priority: task.priority as "low" | "medium" | "high",
          })
        );
        setTasks(loadedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setNotice({
        tone: "error",
        message: "Failed to load data from database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [setNotice, setTasks, setColumns, setConversationId, setMessages, INITIAL_AI_MESSAGE]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectBoard = React.useCallback(
    (board: Board) => {
      setActiveBoard(board);
      localStorage.setItem("activeBoardId", board.id);
      loadData(board.id);
    },
    [loadData]
  );

  const createBoard = React.useCallback(async (name: string) => {
    const response = await postJson<{ board: BoardData }>("/api/boards", { name });
    const newBoard: Board = {
      id: response.board.id,
      name: response.board.name,
      taskCount: 0,
    };
    setBoards((prev) => [newBoard, ...prev]);
    selectBoard(newBoard);
  }, [selectBoard]);

  const editBoard = React.useCallback(
    async (id: string, name: string) => {
      const response = await fetch(`/api/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "Failed to update board.";
        setNotice({
          tone: "error",
          message,
        });
        return;
      }

      setBoards((prev) =>
        prev.map((board) => (board.id === id ? { ...board, name } : board))
      );

      if (activeBoard?.id === id) {
        setActiveBoard((prev) => (prev ? { ...prev, name } : null));
      }

      setNotice({
        tone: "info",
        message: `Board renamed to "${name}".`,
      });
    },
    [activeBoard?.id, setNotice]
  );

  const deleteBoard = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/boards/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "Failed to delete board.";
        setNotice({
          tone: "error",
          message,
        });
        return;
      }

      const deletedBoardName = boards.find((b) => b.id === id)?.name;
      setBoards((prev) => prev.filter((board) => board.id !== id));

      if (activeBoard?.id === id) {
        const remainingBoards = boards.filter((board) => board.id !== id);
        if (remainingBoards.length > 0) {
          selectBoard(remainingBoards[0]);
        } else {
          setActiveBoard(null);
          localStorage.removeItem("activeBoardId");
          setTasks([]);
        }
      }

      setNotice({
        tone: "info",
        message: `Board "${deletedBoardName}" deleted.`,
      });
    },
    [activeBoard?.id, boards, selectBoard, setNotice, setTasks]
  );

  return {
    boards,
    activeBoard,
    isLoading,
    loadData,
    selectBoard,
    createBoard,
    editBoard,
    deleteBoard,
  };
}
