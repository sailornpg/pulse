# RAG Knowledge Settings Panel UX Optimization

## Objective
Improve the interaction model of the RAG knowledge settings panel so the page feels less redundant, cleaner to scan, and more task-oriented without changing the backend contract.

## Planned Changes
- Reframe the page around a single active knowledge-base workspace.
- Replace the always-expanded multi-card ingestion area with a mode switcher that shows one input flow at a time.
- Surface compact summary metrics and clearer status feedback near the top of the page.
- Improve document management discoverability with lightweight filtering and better section grouping.
- Keep the shared/default knowledge base content visually separated from the user-editable area.

## Constraints
- Reuse the existing component library already present in `src/components/ui`.
- Avoid adding new dependencies for tabs, accordions, or form libraries.
- Preserve current API requests, payloads, and auth behavior.

## Validation
- Run `npm run build` after the refactor.
- Sanity-check the panel for logged-in and logged-out states and for long document lists inside the dialog layout.

## Outcome
- Completed the panel refactor in `src/components/settings/RagKnowledgeSettingsPanel.tsx`.
- TypeScript validation passed with `npx tsc --noEmit`.
- Full `npm run build` reached the Vite build phase but could not finish because the existing `dist/assets` directory was locked by another process in the local environment.
