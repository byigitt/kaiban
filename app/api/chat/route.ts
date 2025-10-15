import { NextResponse } from "next/server";
import { z } from "zod";
import { invokeGemini } from "@/lib/gemini";
import { getNextCaseNumber } from "@/lib/prisma";
import { handleFunctionCall } from "@/lib/api/chat-handler";
import { NotFoundError } from "@/lib/api/errors";

const requestSchema = z.object({
  command: z.string().min(1, "Provide a command to parse."),
  conversationId: z
    .string()
    .cuid("Provide a valid conversation identifier."),
  boardId: z.string().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors).flat();
    const message =
      [...flattened.formErrors, ...fieldErrors].join(" ") || "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { command, conversationId, boardId } = parsed.data;
    const nextCaseNumber = await getNextCaseNumber();
    const augmentedPrompt = `${command}\n\n[System: Start task numbering from TASK-${nextCaseNumber}]`;
    const functionCall = await invokeGemini(augmentedPrompt);

    const result = await handleFunctionCall({
      functionCall,
      conversationId,
      command,
      boardId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("chat route failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process command.",
      },
      { status: 500 }
    );
  }
}
