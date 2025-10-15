import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import {
  GEMINI_PROMPT_VERSION,
  taskPrioritySchema,
} from "@/lib/gemini-contract";
import { prisma } from "@/lib/prisma";

const updateTaskSchema = z.object({
  newCaseNumber: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: taskPrioritySchema.optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseNumber: string }> }
) {
  const { caseNumber } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") ||
      "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { newCaseNumber, description, priority } = parsed.data;

  if (!newCaseNumber && !description && !priority) {
    return NextResponse.json(
      { error: "At least one field must be provided for update." },
      { status: 400 }
    );
  }

  const existingTask = await prisma.note.findUnique({
    where: { caseNumber },
  });

  if (!existingTask) {
    return NextResponse.json(
      { error: `Task ${caseNumber} not found.` },
      { status: 404 }
    );
  }

  if (newCaseNumber && newCaseNumber !== caseNumber) {
    const conflict = await prisma.note.findUnique({
      where: { caseNumber: newCaseNumber },
    });

    if (conflict) {
      return NextResponse.json(
        { error: `Task ${newCaseNumber} already exists.` },
        { status: 409 }
      );
    }
  }

  const metadata =
    existingTask.metadata &&
    typeof existingTask.metadata === "object" &&
    !Array.isArray(existingTask.metadata)
      ? (existingTask.metadata as Prisma.JsonObject)
      : ({} as Prisma.JsonObject);

  const updatedMetadata: Prisma.JsonObject = {
    ...metadata,
    updatedVia: "manual-edit",
    updatedAt: new Date().toISOString(),
  };

  const updateData: Prisma.NoteUpdateInput = {
    metadata: updatedMetadata,
  };

  if (newCaseNumber) {
    updateData.caseNumber = newCaseNumber;
  }
  if (description) {
    updateData.body = description;
  }
  if (priority) {
    updateData.priority = priority;
  }

  const updatedTask = await prisma.note.update({
    where: { id: existingTask.id },
    data: updateData,
  });

  return NextResponse.json({
    caseNumber: updatedTask.caseNumber,
    description: updatedTask.body,
    status: updatedTask.status,
    priority: updatedTask.priority,
  });
}
