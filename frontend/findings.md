# Findings

## 2026-03-19
- `RagKnowledgeSettingsPanel.tsx` currently renders four primary action cards at once: knowledge base selection, manual entry, file upload, and URL import.
- The page also renders a full-height document management panel at the same time, so creation and management compete for attention.
- The workflow is implicit instead of explicit: users should conceptually do `select knowledge base -> choose import method -> review/manage documents`, but the current layout does not enforce or signal that order.
- The repo uses simple `Card`, `Button`, `Badge`, `Input`, and `ScrollArea` primitives. There is no tabs or accordion component in `src/components/ui`, so any mode switch should be implemented with lightweight existing primitives.
- `Settings.tsx` renders this panel inside a dialog with fixed height, so reducing vertical clutter inside the panel will materially improve usability.
- The refactor now uses a single active ingestion mode, a current-workspace summary, and a searchable document view switcher to reduce simultaneous cognitive load.
- `useDeferredValue` is sufficient for client-side search smoothing here; the document list is local state and does not need extra memoization or a new data layer.
- Frontend type-check passes with `npx tsc --noEmit`.
