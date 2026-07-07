# ClassMate AI

Privacy-first, local-first Chrome Side Panel study copilot. The pnpm workspace contains the Manifest V3 extension, optional Next.js API, and framework-independent domain, contract, content, prompt, and AI packages.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Load `apps/extension/dist` as an unpacked extension in Chrome. Copy `.env.example` to `.env.local` under `apps/web` before running the optional API.

The product never captures a page until the student requests it. Provider credentials stay device-local and are never synced.
