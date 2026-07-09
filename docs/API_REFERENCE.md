# API Reference

The shared contracts in `packages/contracts` are the source of truth for request, response, storage, artifact, sync, collaboration, and analytics shapes.

## Extension APIs

The extension communicates internally through the existing messaging layer between:

- Side panel workspace.
- Background service worker.
- Content scripts.
- Chrome storage adapters.
- IndexedDB repositories.

## Provider APIs

AI requests flow through the provider abstraction and intelligence layer. Provider-specific credentials remain in local extension storage and are not emitted to logs.

## Backend APIs

The Next.js app hosts the optional server API skeleton. Backend handlers must validate inputs with Zod schemas from `packages/contracts` before reading or writing MongoDB data.
