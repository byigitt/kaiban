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
  const notes = await prisma.note.findMany({
    where: { caseNumber: { startsWith: "TASK-" } },
    select: { caseNumber: true },
  });

  if (notes.length === 0) {
    return 1;
  }

  const numbers = notes
    .map((note) => {
      const match = note.caseNumber.match(/TASK-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}
