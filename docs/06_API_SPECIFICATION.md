# ClassMate AI — API Specification

**Version:** 1.0.0  
**Purpose:** Define the HTTP and streaming API contracts for identity, synchronization, library, study generation, practice, exports, sharing, reminders, providers, and operations.

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication and Authorization](#2-authentication-and-authorization)
3. [Common Schemas](#3-common-schemas)
4. [Identity Endpoints](#4-identity-endpoints)
5. [Library and Sync Endpoints](#5-library-and-sync-endpoints)
6. [Study and AI Endpoints](#6-study-and-ai-endpoints)
7. [Practice, Export, Share, and Reminder Endpoints](#7-practice-export-share-and-reminder-endpoints)
8. [Errors, Limits, and Idempotency](#8-errors-limits-and-idempotency)
9. [Versioning and Compatibility](#9-versioning-and-compatibility)
10. [Examples](#10-examples)
11. [Best Practices](#11-best-practices)
12. [Design Decisions](#12-design-decisions)
13. [Engineering Notes](#13-engineering-notes)
14. [Future Improvements](#14-future-improvements)

## 1. API Conventions

Base path is `/api/v1`. JSON uses UTF-8, camelCase, ISO 8601 UTC timestamps, and public opaque IDs. Requests and responses are Zod-validated. Maximum body size is endpoint-specific. Clients send `X-Request-Id`; the server supplies one if absent. `Idempotency-Key` is mandatory for retryable creates and generations.

Successful single-resource responses use `{ "data": resource, "meta": {...} }`; lists add opaque cursor pagination. No response exposes internal database identifiers, provider secrets, stack traces, or raw provider payloads.

### 1.1 Pagination and filtering

List parameters include `limit` (default 25, max 100), `cursor`, documented filters, and stable sort. Responses include `page.nextCursor` and `page.hasMore`. Offset pagination is not used for mutable large lists.

## 2. Authentication and Authorization

Access tokens are short-lived JWTs with issuer, audience, subject, session, issue, expiry, and limited scopes. Refresh tokens rotate and are transmitted through the approved extension flow; browser web surfaces use secure, HttpOnly, SameSite cookies where applicable. Every resource action verifies authenticated subject and ownership/role.

| Scope | Capability |
|---|---|
| `profile:read/write` | Account and settings |
| `library:read/write` | Synchronized study data |
| `generation:create` | AI generation through server gateway |
| `practice:read/write` | Items and attempts |
| `share:write` | Create/revoke shares |
| `offline_access` | Refresh-token issuance |

## 3. Common Schemas

### 3.1 Error envelope

```json
{
  "error": {
    "code": "PROVIDER_RATE_LIMITED",
    "message": "The selected provider is temporarily rate-limited.",
    "requestId": "req_opaque",
    "retryable": true,
    "retryAfterSeconds": 22,
    "details": [{ "path": "modelId", "reason": "temporarily_unavailable" }]
  }
}
```

Details never echo sensitive input. Stable error families are `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PRECONDITION_FAILED`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `PROVIDER_*`, `STORAGE_*`, and `INTERNAL_ERROR`.

### 3.2 Source reference

A source reference includes `sourceId`, title, canonical display URL, type, captured time, content hash, scope, and selected chunk IDs. Source payload upload is separate from metadata and subject to limits/consent.

### 3.3 Concurrency

Mutable resources return `revision` and `ETag`. Updates include `If-Match`; mismatch returns `409 CONFLICT` with safe current metadata. PATCH semantics are explicitly defined per endpoint; missing fields are not null.

## 4. Identity Endpoints

| Method/path | Purpose | Notes |
|---|---|---|
| `POST /auth/register` | Create account | Generic duplicate response; email verification policy |
| `POST /auth/login` | Authenticate | Rate-limited; device metadata minimized |
| `POST /auth/refresh` | Rotate refresh token | Reuse revokes family |
| `POST /auth/logout` | Revoke current session | Idempotent |
| `GET /me` | Profile/settings summary | Authenticated |
| `PATCH /me` | Update supported profile fields | `If-Match` |
| `GET /me/sessions` | List active devices | Safe device labels only |
| `DELETE /me/sessions/{id}` | Revoke device | Cannot access another user |
| `POST /me/export` | Start privacy export | Idempotent job |
| `DELETE /me` | Begin account deletion | Re-authentication and explicit scope |

## 5. Library and Sync Endpoints

### 5.1 Resource endpoints

| Method/path | Purpose |
|---|---|
| `GET/POST /artifacts` | List/create synchronized artifact metadata |
| `GET/PATCH/DELETE /artifacts/{id}` | Read/update/delete artifact |
| `GET/POST /artifacts/{id}/revisions` | List/create immutable revision |
| `GET/POST /sources` | List/register source snapshot |
| `POST /sources/{id}/content` | Upload consented bounded content |
| `GET/POST /collections` | List/create collections |
| `PATCH/DELETE /collections/{id}` | Rename/move/delete collection |
| `POST/DELETE /collections/{id}/items` | Add/remove memberships idempotently |
| `GET/POST /folders` | Tree/list and create folder |
| `PATCH/DELETE /folders/{id}` | Move/delete with child policy |
| `GET/POST /tags` | Search/create normalized tags |
| `GET /search` | Search owned synchronized data |

Creating a revision references an existing source or includes a consented source registration. The server validates artifact schema by type/version and all citation references.

### 5.2 Sync

`POST /sync/push` accepts a bounded ordered mutation batch with `deviceId`, `baseCursor`, and mutation IDs. `GET /sync/pull?cursor=...&limit=...` returns changes and tombstones. `POST /sync/ack` allows the server to expire delivered change history under policy. A `409` can contain structured conflicts without rejecting unrelated valid mutations when batch semantics declare partial results.

## 6. Study and AI Endpoints

### 6.1 Catalog and estimates

`GET /ai/catalog` returns models available to the user with provider, capability flags, context/output limits, free/paid class, health class, privacy route, and model-catalog version. It does not disclose server keys or internal quota details. `POST /ai/estimate` returns token-size and route eligibility estimates without invoking a model.

### 6.2 Generation

`POST /generations` validates action, prompt-template version or supported action settings, source/chunks, desired artifact schema, provider preference, locale, privacy mode, and client operation ID. It returns `202` with operation ID and a stream URL, or begins an SSE response by negotiated mode.

SSE events:

| Event | Payload |
|---|---|
| `operation` | operation/attempt ID, accepted route, timestamps |
| `phase` | preparing, routing, streaming, validating |
| `delta` | monotonic sequence, text or typed block patch |
| `citation` | validated citation mapping |
| `usage` | normalized input/output token counts when known |
| `warning` | truncation, fallback, unsupported optional feature |
| `complete` | terminal artifact, provenance, finish reason |
| `error` | normalized safe error and partial-content status |

Events include sequence numbers. Keepalive comments are not semantic events. Clients reconnect to `GET /generations/{id}/events?after=sequence` when retention supports it; otherwise `GET /generations/{id}` returns terminal/partial status. `POST /generations/{id}/cancel` is idempotent.

### 6.3 Threads

`GET/POST /threads`, `GET/PATCH/DELETE /threads/{id}`, and `GET/POST /threads/{id}/messages` manage synchronized conversations. A user message and generation operation can be created atomically through the generation endpoint. Editing an old message creates a branch rather than rewriting provenance.

## 7. Practice, Export, Share, and Reminder Endpoints

| Method/path | Purpose | Important constraint |
|---|---|---|
| `GET/POST /practice/items` | List/create items | Typed, citation-valid |
| `POST /practice/attempts` | Record attempt | Idempotent; client answer not placed in logs |
| `GET /practice/due` | Due queue | Timezone and limit required |
| `GET /analytics/study` | Aggregated learning metrics | No manipulative streak defaults |
| `POST /exports` | Start Markdown/PDF/Word export | Snapshot revision and expiry |
| `GET /exports/{id}` | Job status/download metadata | Signed short-lived download |
| `POST /shares` | Create expiring immutable share | Raw token returned once |
| `DELETE /shares/{id}` | Revoke share | Immediate authorization denial |
| `GET /public/shares/{token}` | Read public snapshot | Rate-limited, no owner-private metadata |
| `GET/POST /reminders` | List/create reminders | IANA timezone and consent |
| `PATCH/DELETE /reminders/{id}` | Update/cancel | Revision protected |

## 8. Errors, Limits, and Idempotency

Rate limits use account, IP risk class, route, and provider quotas without permanently penalizing shared networks. Responses include `Retry-After` where known. Default limits: JSON body 1 MiB; source content 5 MiB compressed/uncompressed policy checked; sync batch 100 mutations; generation source budget model-specific; stream duration bounded by route policy. Exact deploy values are published through safe client configuration.

Idempotency records bind user, route, canonical request hash, and key. Reusing a key with a different payload returns `409 IDEMPOTENCY_MISMATCH`. Completed responses can be replayed; in-progress requests return their operation; expired records create a new operation only after the documented window.

## 9. Versioning and Compatibility

Major breaking changes use `/v2`; additive fields and endpoints remain in v1. Clients ignore unknown response fields but reject unknown enum values only when unsafe. Deprecated fields carry documentation, telemetry evidence, minimum extension version, and removal date. The API supports the current and previous extension release during staged rollout. Schema versions inside artifacts evolve independently of HTTP version.

## 10. Examples

### 10.1 Start generation

```json
{
  "clientOperationId": "op_01...",
  "action": "exam_answer",
  "settings": { "marks": 10, "language": "en", "depth": "standard" },
  "sourceRefs": [{ "sourceId": "src_01...", "chunkIds": ["c1", "c2"] }],
  "providerPreference": { "mode": "free_first", "allowPaid": false },
  "artifactSchemaVersion": 1
}
```

### 10.2 Conflict response

An artifact title PATCH with revision 6 when the server is at 7 returns `CONFLICT`, current revision, changed-field names, and recovery options. It does not disclose the full current artifact unless the caller is authorized and requests it.

## 11. Best Practices

- Design endpoints around resources and durable operations, not UI component calls.
- Validate at ingress and again at critical domain boundaries.
- Keep streams monotonic, cancellable, and safe to resume.
- Make retries idempotent and errors actionable.
- Use explicit field projection and pagination.
- Publish an OpenAPI artifact generated from or checked against Zod contracts.

## 12. Design Decisions

REST plus SSE is broadly compatible, debuggable, and appropriate for one-way model streaming; WebSockets add state without current benefit. Operation resources separate HTTP lifetime from model lifetime. Opaque cursor pagination tolerates concurrent writes. Provider catalogs are capability-based so clients do not hard-code vendor behavior.

## 13. Engineering Notes

Next.js route handlers must disable accidental response buffering for SSE and send correct cache headers. Public share endpoints use stricter CSP and referrer policy. CORS allowlists exact extension/web origins. API examples are contractual fixtures. Correlation, trace, and idempotency IDs are distinct.

## 14. Future Improvements

Potential additions include batch study-pack creation, resumable uploads, webhooks for organization deployments, GraphQL read models only if demonstrated, encrypted payload sync, and standardized AI gateway protocols. Each requires backward-compatible contracts and abuse analysis.
