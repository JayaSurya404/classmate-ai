# Developer Setup

## Workspace commands

- `pnpm install` installs the workspace.
- `pnpm dev` starts the extension and optional web app development targets.
- `pnpm typecheck` validates strict TypeScript project references.
- `pnpm test` runs Vitest across apps and packages.
- `pnpm build` builds every package and app.
- `pnpm check` runs the full release quality gate.

## Repository layout

- `apps/extension` contains the Chrome MV3 side panel, service worker, content script, workspace, and local storage adapters.
- `apps/web` contains the Next.js backend skeleton and API surface.
- `packages/contracts` owns runtime schemas and shared TypeScript contracts.
- `packages/content-core` owns source extraction and normalization.
- `packages/ai-core` owns providers, intelligence, semantic search, and RAG infrastructure.
- `packages/learning-tools` owns learning artifact services.
- `packages/prompt-library` owns reusable prompt templates.
- `packages/ui` owns the design system.

## Quality expectations

Keep business logic inside packages where possible, keep UI files modular, avoid broad permissions, and add tests for production behavior changes.
