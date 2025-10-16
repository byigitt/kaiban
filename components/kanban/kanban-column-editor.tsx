"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface KanbanColumnEditorValue {
  title: string;
  helper: string;
}

interface KanbanColumnEditorProps {
  value: KanbanColumnEditorValue;
  onChange: (next: Partial<KanbanColumnEditorValue>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export function KanbanColumnEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: KanbanColumnEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        value={value.title}
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="Column name"
        aria-label="Column title"
        autoFocus
      />
      <Textarea
        value={value.helper}
        onChange={(event) => onChange({ helper: event.target.value })}
        placeholder="Description"
        rows={2}
        aria-label="Column description"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
