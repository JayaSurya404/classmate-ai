# Extension Operations

## Manifest V3 review

- The extension uses Manifest V3.
- The background runtime is a module service worker.
- The UI runs in the Chrome Side Panel.
- The content script only captures content after a user action.
- The CSP limits scripts to the extension package and blocks object/embed execution.
- Incognito mode is disabled.

## Permissions

Required permissions support the Side Panel, active tab capture, local storage, context menus, scripting, and scheduled background work. Host permissions are optional and requested only for capture workflows.

## Local-first data

Study artifacts, provider settings, embeddings, sync metadata, version history, and collaboration metadata are persisted through the existing storage abstractions.
