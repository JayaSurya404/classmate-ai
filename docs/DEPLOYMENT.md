# Deployment Guide

## Extension release candidate

1. Run `pnpm check`.
2. Confirm `apps/extension/dist/manifest.json` is Manifest V3 and uses the production name.
3. Package `apps/extension/dist` as the Chrome Web Store upload artifact.
4. Include the store assets from `apps/extension/store-assets`.
5. Keep release notes in `CHANGELOG.md`.

The release workflow `.github/workflows/release.yml` builds the repository and uploads a release-candidate artifact without publishing it.

## Optional web backend

The Next.js app is deployed independently from the extension. Configure MongoDB and secrets in the hosting environment, then run the app build from the workspace.

## Rollback

For extension releases, publish the previous approved package from Chrome Web Store Developer Dashboard. For backend releases, redeploy the previous verified build artifact.
