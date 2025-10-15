import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Notice } from "@/lib/types/board-types";

interface NoticeAlertProps {
  notice: Notice | null;
}

export function NoticeAlert({ notice }: NoticeAlertProps) {
  if (!notice) {
    return null;
  }

  const icon =
    notice.tone === "error" ? (
      <AlertCircle className="size-4" aria-hidden="true" />
    ) : (
      <Info className="size-4" aria-hidden="true" />
    );

  return (
    <Alert
      variant={notice.tone === "error" ? "destructive" : "default"}
      className="mb-4 items-center gap-4"
    >
      {icon}
      <AlertTitle className="sr-only">
        {notice.tone === "error" ? "Error" : "Info"}
      </AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}
