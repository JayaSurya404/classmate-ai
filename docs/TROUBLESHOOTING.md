# Troubleshooting

## Extension does not load

Run `pnpm build`, then reload `apps/extension/dist` from `chrome://extensions`. Confirm Chrome is version 116 or newer.

## Side Panel shows recovery screen

Use **Retry workspace**. If the issue repeats, capture the diagnostic ID shown in the recovery screen and attach browser console logs.

## Provider requests fail

Verify the selected provider is configured, the key is saved locally, and Ollama is running when using local inference.

## Local data looks stale

Refresh the Side Panel. The app uses IndexedDB and Chrome storage; data remains local unless sync is explicitly configured.

## Release workflow fails

Run the same command locally with `pnpm check`, fix the first failing quality gate, and re-run the workflow.
