import * as React from "react";
import { Loader2 } from "lucide-react";
import { FiSend, FiTrash2 } from "react-icons/fi";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/types/board-types";

interface ChatSidebarProps {
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (value: string) => void;
  pendingAction: "create" | "update" | null;
  hasTasks: boolean;
  onSendMessage: (event: React.FormEvent<HTMLFormElement>) => void;
  onClearChat: () => void;
  width: number;
  isResizing: boolean;
  onResizeStart: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatSidebar({
  messages,
  messageInput,
  setMessageInput,
  pendingAction,
  hasTasks,
  onSendMessage,
  onClearChat,
  width,
  isResizing,
  onResizeStart,
  messagesEndRef,
}: ChatSidebarProps) {
  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l bg-card/60"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
        onMouseDown={onResizeStart}
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
          onClick={onClearChat}
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
          <form onSubmit={onSendMessage} className="flex flex-col gap-3">
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
  );
}
