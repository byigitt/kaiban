import * as React from "react";
import type { Task } from "@/lib/gemini-contract";
import type { Board, ChatMessage, ChatResponse, CreateBoardResponse } from "@/lib/types/board-types";
import type { KanbanColumn } from "@/components/kanban/kanban-board";
import { postJson } from "@/lib/api/client";

interface UseChatManagerProps {
  hasTasks: boolean;
  conversationId: string | null;
  activeBoard: Board | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setActiveBoard: React.Dispatch<React.SetStateAction<Board | null>>;
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>;
  selectBoard: (board: Board) => void;
  INITIAL_AI_MESSAGE: ChatMessage;
}

export function useChatManager({
  hasTasks,
  conversationId,
  activeBoard,
  setConversationId,
  setTasks,
  setBoards,
  setActiveBoard,
  setColumns,
  selectBoard,
  INITIAL_AI_MESSAGE,
}: UseChatManagerProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_AI_MESSAGE]);
  const [messageInput, setMessageInput] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<"create" | "update" | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!messageInput.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageInput("");
    setPendingAction(hasTasks ? "update" : "create");

    try {
      if (!hasTasks) {
        const data = await postJson<CreateBoardResponse>("/api/create-board", {
          text: messageInput,
          boardId: activeBoard?.id,
        });
        setConversationId(data.conversationId);
        setTasks(data.tasks);

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I've created ${data.tasks.length} task${data.tasks.length === 1 ? "" : "s"} on your board. You can now drag them between columns or ask me to update them.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        if (!conversationId) {
          throw new Error("Missing conversation context. Please refresh and try again.");
        }

        const data = await postJson<ChatResponse>("/api/chat", {
          command: messageInput,
          conversationId,
          boardId: activeBoard?.id,
        });

        if (data.action === "delete") {
          setTasks((previous) =>
            previous.filter((task) => task.caseNumber !== data.caseNumber)
          );

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I've deleted ${data.caseNumber} from your board.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.action === "update_status") {
          setTasks((previous) => {
            const index = previous.findIndex(
              (task) => task.caseNumber === data.caseNumber
            );
            if (index === -1) {
              return previous;
            }
            const next = [...previous];
            next[index] = { ...previous[index], status: data.newStatus! };
            return next;
          });

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I've moved ${data.caseNumber} to ${data.newStatus}.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.action === "update_properties") {
          setTasks((previous) => {
            const index = previous.findIndex(
              (task) => task.caseNumber === data.caseNumber
            );
            if (index === -1) {
              return previous;
            }
            const next = [...previous];
            const updatedTask = { ...previous[index] };
            if (data.newCaseNumber) {
              updatedTask.caseNumber = data.newCaseNumber;
            }
            if (data.newTitle) {
              updatedTask.title = data.newTitle;
            }
            if (data.newDescription) {
              updatedTask.description = data.newDescription;
            }
            if (data.newPriority) {
              updatedTask.priority = data.newPriority as "low" | "medium" | "high";
            }
            next[index] = updatedTask;
            return next;
          });

          const changes = [];
          if (data.newCaseNumber) {
            changes.push(`renamed to ${data.newCaseNumber}`);
          }
          if (data.newTitle) {
            changes.push("title updated");
          }
          if (data.newDescription) {
            changes.push("description updated");
          }
          if (data.newPriority) {
            changes.push(`priority changed to ${data.newPriority}`);
          }

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I've updated ${data.caseNumber}: ${changes.join(" and ")}.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.action === "create_board") {
          if (data.board) {
            const newBoard: Board = {
              id: data.board.id,
              name: data.board.name,
              taskCount: 0,
            };
            setBoards((prev) => [newBoard, ...prev]);
            setActiveBoard(newBoard);
            localStorage.setItem("activeBoardId", newBoard.id);

            const newColumns: KanbanColumn[] = data.board.columns.map((col) => ({
              id: col.title,
              title: col.title,
              helper: col.helper ?? "",
            }));
            setColumns(newColumns);

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've created a new board "${data.board.name}" with ${data.board.columns.length} column(s).`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else if (data.action === "update_board") {
          if (data.board) {
            setBoards((prev) =>
              prev.map((board) =>
                board.id === data.board!.id
                  ? { ...board, name: data.board!.name }
                  : board
              )
            );

            if (activeBoard?.id === data.board.id) {
              setActiveBoard((prev) =>
                prev ? { ...prev, name: data.board!.name } : null
              );
            }

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've renamed the board to "${data.board.name}".`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else if (data.action === "delete_board") {
          if (data.boardId) {
            setBoards((prev) => prev.filter((board) => board.id !== data.boardId));

            if (activeBoard?.id === data.boardId) {
              setBoards((boards) => {
                const remainingBoards = boards.filter((board) => board.id !== data.boardId);
                if (remainingBoards.length > 0) {
                  selectBoard(remainingBoards[0]);
                } else {
                  setActiveBoard(null);
                  localStorage.removeItem("activeBoardId");
                  setTasks([]);
                }
                return boards;
              });
            }

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've deleted the board.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else if (data.action === "create_column") {
          if (data.column) {
            const newColumn: KanbanColumn = {
              id: data.column.title,
              title: data.column.title,
              helper: data.column.helper ?? "",
            };
            setColumns((prev) => [...prev, newColumn]);

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've added a new column "${data.column.title}" to the board.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else if (data.action === "update_column") {
          if (data.column) {
            setColumns((prev) =>
              prev.map((col) =>
                col.id === data.column!.id
                  ? {
                      ...col,
                      id: data.column!.title,
                      title: data.column!.title,
                      helper: data.column!.helper ?? "",
                    }
                  : col
              )
            );

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've updated the column to "${data.column.title}".`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else if (data.action === "delete_column") {
          if (data.columnTitle) {
            setColumns((prev) =>
              prev.filter((col) => col.title !== data.columnTitle)
            );
            setTasks((prev) =>
              prev.filter((task) => task.status !== data.columnTitle)
            );

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've deleted the column "${data.columnTitle}" and removed any tasks in it.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error ? error.message : "Sorry, I couldn't process that request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingAction(null);
    }
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await postJson("/api/clear-messages", { conversationId });
      } catch (error) {
        throw error;
      }
    }

    setMessages([INITIAL_AI_MESSAGE]);
  };

  return {
    messages,
    messageInput,
    pendingAction,
    messagesEndRef,
    setMessages,
    setMessageInput,
    sendMessage,
    clearChat,
  };
}
