# Privacy data inventory

| Data | Purpose | Default location | Retention | Deletion |
|---|---|---|---|---|
| Captured selection/page text | User-requested study context | IndexedDB, ephemeral until save | Operation recovery window | Automatic cleanup or user deletion |
| Drafts and settings | Resume work and preferences | Extension local storage | Until reset/uninstall | Settings data controls |
| Provider credentials | Direct provider authentication | Extension local storage only | Until removed | Provider settings |
| Saved sources/artifacts | Local study library | IndexedDB | Until user deletion | Local deletion and quota tools |
| Account/session | Optional synchronization | MongoDB; refresh token hashes only | Session expiry/revocation | Account deletion workflow |
| Safe operational events | Reliability and security | Server logs with no content | 30–90 days by environment | Automated expiry |

No page bodies, prompts, generated text, credentials, full URLs with query strings, or user notes enter telemetry. Synchronization and telemetry default off. Incognito use is disabled by product default.
