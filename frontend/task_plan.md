# Task Plan

## Goal
Refactor `src/components/settings/RagKnowledgeSettingsPanel.tsx` to make the RAG settings workflow clearer, less redundant, and easier to scan, while preserving existing backend behavior.

## Phases
- [completed] Audit current interaction flow and identify information hierarchy problems
- [completed] Redesign the panel structure and interaction model
- [completed] Implement the component refactor and supporting UI states
- [completed] Validate the build and document outcomes

## Key Decisions
- Keep the existing API contract unchanged and optimize only frontend interaction and layout.
- Reduce simultaneous visual noise by showing one ingestion mode at a time instead of four equally weighted cards.
- Persist the work in both session planning files and a project plan note under `docs/plans/`.

## Errors Encountered
- `npm run build` hit `EBUSY: resource busy or locked, rmdir 'D:\学习\pulse\frontend\dist\assets'` because the existing output directory was locked by another process.
- `npx vite build --outDir dist-verify` and `npm run build -- --emptyOutDir false` hit a sandbox-specific `EPERM: operation not permitted, lstat 'C:\Users\Administrator'` resolution error.
- `lucide-react` in this project version does not export `FilePenLine`; replaced with `FileEdit`.
