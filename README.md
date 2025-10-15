# Kaiban
AI Powered Kanban Board, because planning your job shouldnt be your job.

## Local Development

```bash
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) after the dev server starts. Stick to the App Router (`app/`) when adding new routes or layouts.

## Environment

Create a `.env` by copying `.env.example` and updating credentials:

```bash
cp .env.example .env
```

`DATABASE_URL` must point to a PostgreSQL instance (local or hosted). The default string expects a database named `kaiban` with the public schema.

## Database & Prisma

- Prisma migrations live under `prisma/`. The root schema is `prisma/schema.prisma`, which imports modular model files from `prisma/models/`.
- Entities included so far:
  - `Conversation` with related `ConversationMessage` records for assistant/user/system turns.
  - `Note` records for storing structured notes, linked to conversations and keyed by `caseNumber` so Gemini updates stay in sync with the board.
- Generate the client and run migrations with:

```bash
pnpm prisma migrate dev
```

- Use the shared client helper at `@/lib/prisma` inside server code.

## API Contracts

- `POST /api/create-board` accepts `{ text }`, persists the resulting conversation, notes, and Gemini messages, and responds with `{ tasks, conversationId }`.
- `POST /api/update-task` expects `{ command, conversationId }`, appends the request/response messages to that conversation, and updates the matching `Note` status.

## Validation & Build

- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm lint` applies the Next.js ESLint config.
- `pnpm build` creates the production bundle (paired with `pnpm start` for smoke tests when needed).
