# Repository Guidelines

## IMPORTANT
- After doing stuff, make sure to do a typecheck with command and fix if any problem occur. Do not use any for typechecking.
- Do not add extra defensive checks or try/catch blocks
- Never cast to "any"
- Never use dynamic imports (unless asked to) like "await import(..)"
- Use zod to validate deserialized data
- Trust typescript types, if you don’t know the types find them, if you fail to find types tell me explicitly. All libraries we use should have typescript types.
- Adhere to the prompt and do not make any additional changes
- Respond with ‘need more information’ if you are unsure about the task

## Project Structure & Module Organization
Kaiban is a Next.js 16 App Router project focused on converting natural language into Kanban updates. Pages and layouts live in `app/`; Gemini-backed endpoints reside under `app/api/**`. Global styles sit in `app/globals.css`; shared UI primitives stay under `components/ui`, hooks in `hooks/`, and helpers in `lib`. Use the `@/*` alias instead of deep relative paths. Server-side persistence helpers are grouped in `lib/api/*`, Gemini schemas in `lib/gemini-contract.ts`, and the Gemini client wrapper in `lib/gemini.ts`.

## Build, Test, and Development Commands
Standardize on pnpm. `pnpm install` respects `pnpm-lock.yaml`. `pnpm build` creates the production bundle; pair with `pnpm start` only when a production check is strictly required. Skip all lint commands; rely on `pnpm typecheck` (tsc --noEmit) only once a task is otherwise complete to validate Gemini contracts and React components without opening a dev server.

## Coding Style & Naming Conventions
Stay in TypeScript (`.ts`/`.tsx`) with two-space indentation and no implicit `any`. File names use kebab-case (`task-card.tsx`), exported components use PascalCase, and hooks retain the `use-` prefix. Keep Gemini JSON schemas in plain `.ts` modules so server routes and client helpers import the same contract. Tailwind utilities live inline; gate conditional styles with `clsx` or `tailwind-merge`.

## AI Contract & Workflow
The backend mediates all Gemini calls and the function schemas live in `lib/gemini-contract.ts`. Honor the full suite of contracts: `create_tasks_from_text`, `update_task_status`, `delete_task`, `update_task_properties`, `create_board`, `update_board`, `delete_board`, `create_column`, `update_column`, and `delete_column`. Frontend handlers (`use-chat-manager`, `lib/api/chat-handler.ts`, and friends) expect validated `functionCall.args` payloads and will persist updates via the operations modules in `lib/api`. Keep conversational history, Prisma writes, and UI state transitions in sync. Version prompt and schema changes together to avoid drift.

## Testing Guidelines
Automated tests are not yet wired. Treat `pnpm typecheck` as the baseline validation; supplement with targeted manual checks without launching a long-running dev server. When introducing tests, colocate `*.test.ts(x)` files or use a `__tests__/` folder, favor React Testing Library, and document any new `pnpm test` script in `package.json`.

## Commit & Pull Request Guidelines
History is greenfield, so keep it legible. Write imperative commit subjects with tight scope (e.g., `Define Gemini task contract`). Conventional Commit prefixes (`feat`, `fix`, `chore`) are encouraged to prep for changelogs. Pull requests should state the impact, link issues, attach before/after UI captures when relevant, and list manual validation steps so reviewers can verify Gemini-powered flows quickly.
