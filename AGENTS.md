# Repository Guidelines

## Project Structure & Module Organization
`frontend/` contains the React 18 + Vite client. Put pages in `frontend/src/pages`, shared UI in `frontend/src/components`, shadcn primitives in `frontend/src/components/ui`, helpers in `frontend/src/lib`, and types in `frontend/src/types`. Static assets live in `frontend/public` and `frontend/src/assets`.

`backend/` contains the NestJS API. Feature modules live under `backend/src/auth`, `backend/src/chat`, `backend/src/history`, and `backend/src/agent`; shared infrastructure is under `backend/src/common`; tool implementations live in `backend/src/tools`. Planning notes belong in `docs/plans/`.

## Build, Test, and Development Commands
- `cd frontend && npm run dev`: start the Vite dev server on `http://localhost:3000`.
- `cd frontend && npm run build`: run TypeScript checks and build production assets into `frontend/dist`.
- `cd backend && npm run start:dev`: start the NestJS server with file watching on `http://localhost:3001`.
- `cd backend && npm run start`: run the backend without watch mode.
- `cd backend && npx tsc --noEmit -p tsconfig.json`: current backend validation command; there is no dedicated backend build script yet.

## Coding Style & Naming Conventions
Use TypeScript throughout. Follow the existing 2-space indentation and match nearby formatting instead of re-styling files. Frontend files generally use PascalCase component names such as `HomePage.tsx`, the `@/*` import alias, and no semicolons. Backend files follow NestJS naming such as `auth.controller.ts`, `chat.service.ts`, and `render-chart.tool.ts`, and they keep semicolons.

No ESLint or Prettier config is committed today, so keep diffs tight and consistent with the surrounding code.

## Testing Guidelines
There is no full automated test suite wired into `package.json`. Before opening a PR, run the frontend build and the backend type-check, then smoke-test the flows you changed, especially auth, chat streaming, tool rendering, and history persistence.

If you add tests, place them close to the feature they cover and use `*.spec.ts` naming.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commits, for example `feat(agent): ...`, `feat: ...`, and `chore: ...`. Continue that pattern and keep each commit scoped to one feature or package when possible.

PRs should summarize behavior changes, list any environment or schema updates, link the related issue, and include screenshots or short recordings for frontend changes.

## Security & Configuration Tips
Keep secrets in local `.env` files under `backend/` or `frontend/` and never commit API keys, JWT secrets, or Supabase credentials. When changing MCP config, auth logic, or database setup, update the relevant README or docs entry in the same change.
