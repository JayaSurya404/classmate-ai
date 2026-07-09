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

## Production release

Milestone 14 release readiness is documented in:

- [Installation](docs/INSTALLATION.md)
- [Developer setup](docs/DEVELOPER_SETUP.md)
- [Architecture](docs/03_ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Extension operations](docs/EXTENSION.md)
- [API reference](docs/API_REFERENCE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Chrome Web Store package](docs/CHROME_WEB_STORE.md)
- [Privacy Policy](docs/PRIVACY_POLICY.md)
- [Terms of Use](docs/TERMS_OF_USE.md)

Run `pnpm check` before creating a release candidate.
