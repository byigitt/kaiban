import { GEMINI_FUNCTION_DECLARATIONS, GEMINI_SYSTEM_INSTRUCTION } from "@/lib/gemini-contract";

const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_API_ROOT =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown>;
}

interface GeminiPart {
  functionCall?: GeminiFunctionCall;
  text?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
}

function getApiKey() {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY ?? "";
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY."
    );
  }
  return apiKey;
}

function getModel() {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

function extractFunctionCall(
  result: GeminiGenerateContentResponse
): GeminiFunctionCall {
  const candidates = result.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      if (part.functionCall) {
        return part.functionCall;
      }
    }
  }

  throw new Error("Gemini response did not contain a function call.");
}

export async function invokeGemini(prompt: string): Promise<GeminiFunctionCall> {
  const apiKey = getApiKey();
  const model = getModel();

  const response = await fetch(
    `${GEMINI_API_ROOT}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: "AUTO",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    let details = "";
    try {
      const errorBody = await response.json();
      details = JSON.stringify(errorBody);
    } catch {
      details = await response.text();
    }
    throw new Error(
      `Gemini API request failed with status ${response.status}: ${details}`
    );
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  return extractFunctionCall(data);
}
