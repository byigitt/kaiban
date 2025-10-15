import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export async function getNextCaseNumber(): Promise<number> {
  const lastNote = await prisma.note.findFirst({
    where: { caseNumber: { startsWith: "TASK-" } },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });

  if (!lastNote) {
    return 1;
  }

  const match = lastNote.caseNumber.match(/TASK-(\d+)/);
  return match ? parseInt(match[1], 10) + 1 : 1;
}
