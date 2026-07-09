# Chrome Web Store Preparation

## Package

- Build output: `apps/extension/dist`.
- Manifest: `apps/extension/public/manifest.json`.
- Store assets: `apps/extension/store-assets`.
- Privacy Policy: `docs/PRIVACY_POLICY.md`.
- Terms of Use: `docs/TERMS_OF_USE.md`.

## Store description

ClassMate AI is a privacy-first Chrome Side Panel study copilot. Capture the page you are reading, study with AI-powered explanations and learning tools, search your local knowledge base, and keep work local-first with optional sync.

## Release checklist

- `pnpm install` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `pnpm test` passes.
- Manifest V3 loads as an unpacked extension.
- CSP remains strict.
- Required permissions match documented runtime needs.
- Store screenshots and promotional images are exported from the prepared asset folders.
- Privacy Policy and Terms of Use are linked in the store listing.
