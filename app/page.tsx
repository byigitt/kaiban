"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";
import { HomeHeader } from "@/components/home-header";
import { ChatSidebar } from "@/components/chat-sidebar";
import { NoticeAlert } from "@/components/notice-alert";
import type { Task } from "@/lib/gemini-contract";
import type { Notice, ChatMessage, Board } from "@/lib/types/board-types";
import type { KanbanColumn } from "@/components/kanban/kanban-board";
import { useBoardManager } from "@/hooks/use-board-manager";
import { useTaskManager } from "@/hooks/use-task-manager";
import { useChatManager } from "@/hooks/use-chat-manager";
import { useResize } from "@/hooks/use-resize";

const INITIAL_AI_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your Kaiban assistant. Tell me what tasks you'd like to create, or give me commands to update existing tasks.",
  timestamp: new Date(),
};

export default function HomePage() {
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_AI_MESSAGE]);
  const [boards, setBoards] = React.useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = React.useState<Board | null>(null);

  const { width: chatWidth, isResizing, handleMouseDown } = useResize(480);

  const {
    tasks,
    columns,
    setTasks,
    setColumns,
    moveTask,
    addTask,
    removeTask,
    editTask,
    addColumn,
    editColumn,
    removeColumn,
  } = useTaskManager({ conversationId, setNotice });

  const {
    boards: loadedBoards,
    activeBoard: loadedActiveBoard,
    isLoading,
    selectBoard,
    createBoard,
    editBoard,
    deleteBoard,
  } = useBoardManager({
    setNotice,
    setTasks,
    setColumns,
    setConversationId,
    setMessages,
    INITIAL_AI_MESSAGE,
  });

  React.useEffect(() => {
    setBoards(loadedBoards);
  }, [loadedBoards]);

  React.useEffect(() => {
    setActiveBoard(loadedActiveBoard);
  }, [loadedActiveBoard]);

  const {
    messages: chatMessages,
    messageInput,
    pendingAction,
    messagesEndRef,
    setMessageInput,
    sendMessage,
    clearChat,
  } = useChatManager({
    hasTasks: tasks.length > 0,
    conversationId,
    activeBoard,
    setConversationId,
    setTasks,
    setBoards,
    setActiveBoard,
    setColumns,
    selectBoard,
    INITIAL_AI_MESSAGE,
  });

  React.useEffect(() => {
    setMessages(chatMessages);
  }, [chatMessages]);

  const handleTaskClick = React.useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskDrawerOpen(true);
  }, []);

  const handleResetBoard = () => {
    setTasks([]);
    setNotice({
      tone: "info",
      message: "Board cleared.",
    });
  };

  const handleClearChat = async () => {
    try {
      await clearChat();
      setNotice({
        tone: "info",
        message: "Chat history cleared.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to clear chat history.",
      });
    }
  };

  if (isLoading) {
    return (
      <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
        <HomeHeader
          boards={boards}
          activeBoard={activeBoard}
          taskCount={tasks.length}
          hasTasks={tasks.length > 0}
          disabled={pendingAction !== null}
          onSelectBoard={selectBoard}
          onCreateBoard={createBoard}
          onEditBoard={editBoard}
          onDeleteBoard={deleteBoard}
          onClearBoard={handleResetBoard}
        />

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto px-8 py-6">
            <NoticeAlert notice={notice} />
            <KanbanBoard
              tasks={tasks}
              columns={columns}
              onMoveTask={moveTask}
              onAddTask={addTask}
              onEditTask={editTask}
              onRemoveTask={removeTask}
              onAddColumn={addColumn}
              onEditColumn={editColumn}
              onRemoveColumn={removeColumn}
              onTaskClick={handleTaskClick}
            />
          </div>
        </section>
      </div>

      <ChatSidebar
        messages={messages}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        pendingAction={pendingAction}
        hasTasks={tasks.length > 0}
        onSendMessage={sendMessage}
        onClearChat={handleClearChat}
        width={chatWidth}
        isResizing={isResizing}
        onResizeStart={handleMouseDown}
        messagesEndRef={messagesEndRef}
      />

      <TaskDetailDrawer
        task={selectedTask}
        open={isTaskDrawerOpen}
        onOpenChange={setIsTaskDrawerOpen}
        onDelete={removeTask}
        chatWidth={chatWidth}
      />
    </main>
  );
}
