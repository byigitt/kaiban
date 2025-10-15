"use client";

import * as React from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { FiSend, FiTrash2, FiZap } from "react-icons/fi";

import {
  KanbanBoard,
  type KanbanColumn,
} from "@/components/kanban/kanban-board";
import { BoardSelector } from "@/components/board-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TASK_STATUS_VALUES,
  GEMINI_PROMPT_VERSION,
  type Task,
  type TaskStatus,
} from "@/lib/gemini-contract";

interface BoardData {
  id: string;
  name: string;
  title: string;
  taskCount: number;
  columns: KanbanColumn[];
}

interface Board {
  id: string;
  name: string;
  taskCount: number;
}

interface CreateBoardResponse {
  tasks: Task[];
  conversationId: string;
  boardId: string | null;
}

interface ChatResponse {
  action: "update_status" | "delete" | "update_properties";
  caseNumber: string;
  newStatus?: TaskStatus;
  newCaseNumber?: string;
  newDescription?: string;
  newPriority?: string;
}

type NoticeTone = "info" | "error";

interface Notice {
  tone: NoticeTone;
  message: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const DEFAULT_TASK_TEMPLATE = `Set up the user authentication flow.
Connect the database to the main server.
Design the landing page UI - put this in the backlog for now.`;

const INITIAL_AI_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your Kaiban assistant. Tell me what tasks you'd like to create, or give me commands to update existing tasks.",
  timestamp: new Date(),
};

const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "Backlog",
    title: "Backlog",
    helper: "Ideas and items that are not in motion yet.",
  },
  {
    id: "In Progress",
    title: "In Progress",
    helper: "Work currently being tackled.",
  },
  {
    id: "Testing",
    title: "Testing",
    helper: "Verifications, QA, or user review in flight.",
  },
  {
    id: "Done",
    title: "Done",
    helper: "Completed work ready to close out.",
  },
];

export default function HomePage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [columns, setColumns] = React.useState<KanbanColumn[]>(DEFAULT_COLUMNS);
  const [boards, setBoards] = React.useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = React.useState<Board | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(
    null
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_AI_MESSAGE]);
  const [messageInput, setMessageInput] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<
    "create" | "update" | null
  >(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [chatWidth, setChatWidth] = React.useState(480);
  const [isResizing, setIsResizing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const hasTasks = tasks.length > 0;

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
          const conversationMessages: ChatMessage[] = latestConversation.messages.map(
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
          (task: { caseNumber: string; body: string; status: string; priority: string }) => ({
            caseNumber: task.caseNumber,
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
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMouseDown = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const newWidth = window.innerWidth - event.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const postJson = React.useCallback(
    async <T,>(url: string, payload: unknown): Promise<T> => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch (error) {
        if (response.ok) {
          throw new Error("The server returned an empty response.");
        }
      }

      if (!response.ok) {
        const message =
          data &&
            typeof data === "object" &&
            "error" in data &&
            (data as { error?: unknown }).error
            ? String((data as { error?: unknown }).error)
            : "Request failed.";
        throw new Error(message);
      }

      return data as T;
    },
    []
  );

  const handleSelectBoard = React.useCallback(
    (board: Board) => {
      setActiveBoard(board);
      localStorage.setItem("activeBoardId", board.id);
      loadData(board.id);
    },
    [loadData]
  );

  const handleCreateBoard = React.useCallback(async (name: string) => {
    const response = await postJson<{ board: BoardData }>("/api/boards", { name });
    const newBoard: Board = {
      id: response.board.id,
      name: response.board.name,
      taskCount: 0,
    };
    setBoards((prev) => [newBoard, ...prev]);
    handleSelectBoard(newBoard);
  }, [handleSelectBoard, postJson]);

  const handleEditBoard = React.useCallback(
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
    [activeBoard?.id]
  );

  const handleDeleteBoard = React.useCallback(
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
          handleSelectBoard(remainingBoards[0]);
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
    [activeBoard?.id, boards, handleSelectBoard]
  );

  const handleSendMessage = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
    setNotice(null);

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

  const handleMoveTask = React.useCallback(
    (caseNumber: string, nextStatus: TaskStatus) => {
      let dragNotice: Notice | null = null;
      setTasks((previous) => {
        const index = previous.findIndex(
          (task) => task.caseNumber === caseNumber
        );
        if (index === -1) {
          dragNotice = {
            tone: "error",
            message: `Gemini has not created ${caseNumber} yet.`,
          };
          return previous;
        }

        if (previous[index].status === nextStatus) {
          dragNotice = {
            tone: "info",
            message: `${caseNumber} is already in ${nextStatus}.`,
          };
          return previous;
        }

        const next = [...previous];
        next[index] = { ...previous[index], status: nextStatus };
        dragNotice = {
          tone: "info",
          message: `${caseNumber} moved to ${nextStatus}.`,
        };
        return next;
      });

      if (dragNotice) {
        setNotice(dragNotice);
      }
    },
    []
  );

  const handleAddManualTask = React.useCallback(
    ({
      status,
      caseNumber,
      description,
      priority,
    }: {
      status: TaskStatus;
      caseNumber: string;
      description: string;
      priority: "low" | "medium" | "high";
    }) => {
      const trimmedCaseNumber = caseNumber.trim().toUpperCase();
      const trimmedDescription = description.trim();
      if (!trimmedCaseNumber || !trimmedDescription) {
        return "Both a case number and description are required.";
      }
      const exists = tasks.some(
        (task) => task.caseNumber === trimmedCaseNumber
      );
      if (exists) {
        setNotice({
          tone: "error",
          message: `${trimmedCaseNumber} already exists on the board.`,
        });
        return "This case number is already on the board.";
      }
      setTasks((previous) => [
        ...previous,
        {
          caseNumber: trimmedCaseNumber,
          description: trimmedDescription,
          status,
          priority,
        },
      ]);
      setNotice({
        tone: "info",
        message: `${trimmedCaseNumber} added to ${status}.`,
      });
      return null;
    },
    [tasks]
  );

  const handleRemoveTask = React.useCallback((caseNumber: string) => {
    let removedTask: Task | null = null;
    setTasks((previous) => {
      const index = previous.findIndex(
        (task) => task.caseNumber === caseNumber
      );
      if (index === -1) {
        return previous;
      }
      removedTask = previous[index];
      const next = [...previous];
      next.splice(index, 1);
      return next;
    });
    if (removedTask) {
      setNotice({
        tone: "info",
        message: `${caseNumber} removed from the board.`,
      });
    } else {
      setNotice({
        tone: "error",
        message: `${caseNumber} is not on the board.`,
      });
    }
  }, []);

  const handleEditTask = React.useCallback(
    async (
      caseNumber: string,
      updates: {
        newCaseNumber?: string;
        description?: string;
        priority?: "low" | "medium" | "high";
      }
    ): Promise<string | null> => {
      const response = await fetch(`/api/tasks/${caseNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "Failed to update task.";
        setNotice({
          tone: "error",
          message,
        });
        return message;
      }

      const updatedTask = data as Task;
      setTasks((previous) => {
        const index = previous.findIndex(
          (task) => task.caseNumber === caseNumber
        );
        if (index === -1) {
          return previous;
        }
        const next = [...previous];
        next[index] = updatedTask;
        return next;
      });

      const changes = [];
      if (updates.newCaseNumber) {
        changes.push(`renamed to ${updates.newCaseNumber}`);
      }
      if (updates.description) {
        changes.push("description updated");
      }
      if (updates.priority) {
        changes.push(`priority changed to ${updates.priority}`);
      }

      setNotice({
        tone: "info",
        message: `${caseNumber} updated${changes.length > 0 ? ": " + changes.join(", ") : ""}.`,
      });

      return null;
    },
    []
  );

  const handleResetBoard = () => {
    setTasks([]);
    setColumns(DEFAULT_COLUMNS);
    setNotice({
      tone: "info",
      message: "Board cleared.",
    });
  };

  const handleClearChat = async () => {
    if (conversationId) {
      try {
        await postJson("/api/clear-messages", { conversationId });
      } catch (error) {
        setNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Failed to clear chat history.",
        });
        return;
      }
    }

    setMessages([INITIAL_AI_MESSAGE]);
    setNotice({
      tone: "info",
      message: "Chat history cleared.",
    });
  };

  const handleAddColumn = React.useCallback(
    (column: { title: string; helper: string }) => {
      const newColumn: KanbanColumn = {
        id: column.title,
        title: column.title,
        helper: column.helper,
      };
      setColumns((previous) => [...previous, newColumn]);
      setNotice({
        tone: "info",
        message: `Column "${column.title}" added.`,
      });
    },
    []
  );

  const handleEditColumn = React.useCallback(
    (id: string, column: { title: string; helper: string }) => {
      setColumns((previous) =>
        previous.map((col) =>
          col.id === id
            ? { ...col, title: column.title, helper: column.helper }
            : col
        )
      );
      setNotice({
        tone: "info",
        message: `Column updated to "${column.title}".`,
      });
    },
    []
  );

  const handleRemoveColumn = React.useCallback(
    (id: string) => {
      setColumns((previous) => previous.filter((col) => col.id !== id));
      setTasks((previous) => previous.filter((task) => task.status !== id));
      setNotice({
        tone: "info",
        message: `Column removed.`,
      });
    },
    []
  );

  const noticeIcon =
    notice?.tone === "error" ? (
      <AlertCircle className="size-4" aria-hidden="true" />
    ) : (
      <Info className="size-4" aria-hidden="true" />
    );

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
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
              onSelectBoard={handleSelectBoard}
              onCreateBoard={handleCreateBoard}
              onEditBoard={handleEditBoard}
              onDeleteBoard={handleDeleteBoard}
            />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">•</span>
              <span>Prompt version {GEMINI_PROMPT_VERSION}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetBoard}
              disabled={!hasTasks || pendingAction !== null}
            >
              <FiTrash2 className="size-4" aria-hidden="true" />
              <span>Clear board</span>
            </Button>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto px-8 py-6">
            {notice ? (
              <Alert
                variant={notice.tone === "error" ? "destructive" : "default"}
                className="mb-4 items-center gap-4"
              >
                {noticeIcon}
                <AlertTitle className="sr-only">
                  {notice.tone === "error" ? "Error" : "Info"}
                </AlertTitle>
                <AlertDescription>{notice.message}</AlertDescription>
              </Alert>
            ) : null}
            <KanbanBoard
              tasks={tasks}
              columns={columns}
              onMoveTask={handleMoveTask}
              onAddTask={handleAddManualTask}
              onEditTask={handleEditTask}
              onRemoveTask={handleRemoveTask}
              onAddColumn={handleAddColumn}
              onEditColumn={handleEditColumn}
              onRemoveColumn={handleRemoveColumn}
            />
          </div>
        </section>
      </div>

      <aside
        className="relative flex h-full shrink-0 flex-col border-l bg-card/60"
        style={{ width: `${chatWidth}px` }}
      >
        <div
          className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: isResizing ? "hsl(var(--primary))" : "transparent",
          }}
        />
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <AppIcon
              size={28}
              aria-label="Kaiban icon"
              className="size-10 shrink-0"
            />
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold">Chat with Kaiban</h2>
              <p className="text-sm text-muted-foreground">
                AI assistant for task management
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            disabled={messages.length <= 1 || pendingAction !== null}
            aria-label="Clear chat history"
          >
            <FiTrash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {pendingAction && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">
                        {pendingAction === "create" ? "Creating tasks..." : "Updating..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  value={messageInput}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMessageInput(event.target.value)}
                  placeholder={hasTasks ? "Move TASK-101 to testing" : "Create tasks: Design login page, Set up database"}
                  aria-label="Message input"
                  disabled={pendingAction !== null}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || pendingAction !== null}
                  size="icon"
                >
                  <FiSend className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </aside>
        </>
      )}
    </main>
  );
}
