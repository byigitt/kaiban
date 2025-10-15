# Kaiban
AI-powered Kanban automation that turns natural language into actionable board updates.

![Example dashboard showcasing Kaiban](images/example-dashboard.png)

## Overview
Kaiban pairs a Next.js App Router frontend with Gemini-driven function calls to translate freeform conversation into structured Kanban tasks. Conversations stay synchronized with task notes so every status change is traceable and auditable.

## Key Features
- Natural-language task creation mapped to `{ caseNumber, description, status }` contracts.
- Conversational status updates routed through `update_task_status` for deterministic board changes.
- Shared Prisma models and notes storage keep the AI output aligned with the UI.
- Tailwind-powered UI components deliver an accessible, responsive board experience.

## Getting Started
Install dependencies and launch the local dev server:

```bash
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) once the server is running. Stick to the App Router (`app/`) for new routes and layouts.

## Environment Setup
Copy the example environment file and provide the required secrets:

```bash
cp .env.example .env
```

Configure `DATABASE_URL` to reference a PostgreSQL instance (local or hosted). The default string expects a database named `kaiban` using the `public` schema.

## Database & Prisma
- Migrations live under `prisma/`; `prisma/schema.prisma` composes modular models from `prisma/models/`.
- Core entities include `Conversation`, `ConversationMessage`, and `Note`, keyed by `caseNumber` to mirror board cards.
- Generate the client and apply migrations with:

```bash
pnpm prisma migrate dev
```

- Import the shared client helper from `@/lib/prisma` inside server modules.

## API Contracts
- `POST /api/create-board` accepts `{ text }`, persists the conversation, creates notes, and returns `{ tasks, conversationId }`.
- `POST /api/update-task` expects `{ command, conversationId }`, appends conversational turns, and updates the targeted note status.

## Developer Workflow
- `pnpm typecheck` runs `tsc --noEmit` to validate types.
- `pnpm build` outputs the production bundle; pair with `pnpm start` when smoke-testing.
- Prisma Studio (`pnpm prisma studio`) is helpful for inspecting conversation and notes data during development.
