# Installation

ClassMate AI is distributed as a Chrome Manifest V3 extension with an optional Next.js backend for account and sync capabilities.

## Requirements

- Node.js 20.19 or newer.
- pnpm 9.
- Chrome 116 or newer.
- MongoDB for the optional web backend.

## Local install

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

After the build completes, open `chrome://extensions`, enable Developer Mode, choose **Load unpacked**, and select `apps/extension/dist`.

## Runtime configuration

Provider keys are stored locally by the extension storage layer. The extension supports Gemini, Groq, OpenRouter, and Ollama through the existing provider abstraction. The optional web app reads environment values from `apps/web/.env.local`.
