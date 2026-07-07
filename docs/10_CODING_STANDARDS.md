# ClassMate AI — Coding and Engineering Standards

**Version:** 1.0.0  
**Purpose:** Define implementation standards for TypeScript, React, Chrome MV3, Next.js, data, security, tests, performance, documentation, and delivery.

## Table of Contents

1. [Core Standards](#1-core-standards)
2. [TypeScript](#2-typescript)
3. [React and UI](#3-react-and-ui)
4. [State, Forms, and Data Fetching](#4-state-forms-and-data-fetching)
5. [Chrome Extension](#5-chrome-extension)
6. [Next.js and Backend](#6-nextjs-and-backend)
7. [Security and Privacy](#7-security-and-privacy)
8. [Errors, Logging, and Observability](#8-errors-logging-and-observability)
9. [Testing and Performance](#9-testing-and-performance)
10. [Git, Review, and Documentation](#10-git-review-and-documentation)
11. [Examples](#11-examples)
12. [Best Practices](#12-best-practices)
13. [Design Decisions](#13-design-decisions)
14. [Engineering Notes](#14-engineering-notes)
15. [Future Improvements](#15-future-improvements)

## 1. Core Standards

Correctness, privacy, and readability outrank cleverness. Code is organized around domain behavior, uses explicit boundaries, handles failure as a normal case, and leaves the repository more understandable. Generated code is held to identical review and test standards.

## 2. TypeScript

Use the strictest practical compiler configuration: strict null checks, unchecked indexed access, exact optional properties, override checks, and no implicit returns. `any`, ignored errors, unsafe non-null assertions, broad type assertions, numeric enums, and ambient mutable globals are prohibited. Receive uncertain input as `unknown`, validate, then narrow.

Discriminated unions represent state machines. Branded/value types distinguish IDs and validated concepts. Functions return explicit domain results for expected failures and throw only for exceptional/invariant violations. Public APIs have explicit return types. Exhaustive switches fail compilation when a variant is added.

Names describe domain intent. Boolean names begin with `is`, `has`, `can`, or `should`. Units appear in names/types (`timeoutMs`, `tokenCount`). Avoid abbreviations except established domain terms. Functions generally do one coherent thing; more than three positional parameters become an options object.

## 3. React and UI

React components are pure render functions over props/state. Side effects belong in event handlers or narrowly scoped effects that synchronize external systems. Derived values are computed during render; do not mirror props into state. Hooks are unconditional and dependency-correct.

Prefer composition to configuration-heavy mega-components. Route components coordinate features; semantic components encapsulate accessible behavior; shadcn primitives do not leak everywhere. Every interactive control uses native semantics when possible, visible focus, keyboard behavior, accessible name, loading/disabled semantics, and error association.

Memoization follows measurement. Avoid `useMemo`/`useCallback` as decoration. Stable list keys are domain IDs, never array indexes for mutable lists. Error boundaries exist at shell, route, artifact renderer, and risky optional renderer levels. Suspense/loading boundaries do not erase drafts.

## 4. State, Forms, and Data Fetching

| Concern | Owner |
|---|---|
| Local component interaction | React state |
| Cross-component ephemeral UI | Small feature-scoped Zustand store |
| Server data/cache | TanStack Query |
| Durable local records | Repository over IndexedDB |
| Form values/errors | React Hook Form + Zod |
| URL/view selection | Router/search params where available |

Stores expose actions and selectors, not mutable objects. Server data is not copied into Zustand. Query keys are factories scoped by user/resource/filter; logout clears user caches. Mutations implement optimistic updates only when rollback and conflict behavior are defined. Forms validate at boundaries, show field and form errors, and preserve values on recoverable failure.

## 5. Chrome Extension

- Register service-worker listeners at module evaluation, then delegate.
- Wrap Chrome callbacks/promises in typed adapters with normalized errors.
- Validate every cross-context message using versioned Zod schemas.
- Verify `sender.id`, tab, frame, origin, request nonce, and permission before privileged work.
- Persist operation intent before relying on worker lifetime.
- Avoid broad host permissions, injected page scripts, remote code, `eval`, and unsafe HTML.
- Content scripts extract bounded data and never own business state.
- Treat tab navigation and document replacement as invalidating anchors/context.
- Test worker suspension, extension update, permission removal, restricted URLs, and multiple windows.

## 6. Next.js and Backend

Route handlers authenticate, authorize, validate, call one application orchestration path, and map its result. They do not contain Mongoose queries or provider logic. Server/client component boundaries are explicit; secrets and server modules cannot enter client bundles.

Repositories accept domain values and return domain representations, not Mongoose documents. Queries use projections, lean reads where appropriate, bounded pagination, and index-backed filters. All external effects have timeouts and cancellation. Retryable creates use idempotency. Background work is represented as durable jobs/events, not fire-and-forget promises after response.

JWT algorithms, issuer, audience, expiry, and session are fixed by configuration; never trust token header selection. Password hashes use an approved adaptive algorithm and parameter policy. Authentication messages do not disclose account existence.

## 7. Security and Privacy

Input validation includes type, length, format, allowed values, ownership, and semantic constraints. Output encoding matches context. Markdown/HTML uses a strict sanitizer. URLs allow only required protocols; external links add safe opener/referrer behavior. CSRF protection applies to cookie-authenticated state changes; CORS is an exact allowlist, not a substitute for authorization.

Secrets come from approved environment/secret stores, never source or public build variables. Logs, traces, analytics, screenshots, fixtures, and tests exclude prompts, source bodies, generated content, credentials, and personal identifiers unless a specific consented secure workflow exists. Security-sensitive comparisons and token generation use appropriate cryptographic libraries.

## 8. Errors, Logging, and Observability

Expected errors use stable codes: validation, authentication, authorization, not found, conflict, quota, provider, network, storage, cancellation. Adapters map raw errors once; upper layers do not parse vendor message strings. User messages say what happened, what was preserved, and recovery. Technical context uses a request/correlation ID.

Structured log fields are allowlisted: timestamp, severity, service/version, environment, event name, request/correlation/operation IDs, safe actor hash, route class, duration, status, normalized error. Never log entire objects “for debugging.” Metrics names include units and bounded labels; user IDs, URLs, model error text, and source titles are not metric labels.

## 9. Testing and Performance

### 9.1 Testing

Tests follow arrange/act/assert and state behavior. Use fake clocks and deterministic IDs, not arbitrary sleeps. Mock only external boundaries; contract-test every adapter against a shared suite. E2E covers first run, permission grant/denial, selection capture, streaming/cancel, save/offline/reload, provider fallback, sync conflict, export, delete, keyboard path, and worker suspension.

Prompt evaluation is distinct from deterministic unit tests. Accessibility uses automated scans plus keyboard and assistive-technology review. Security tests cover message spoofing, ownership, injection, XSS, token replay, rate limits, and secrets in artifacts.

### 9.2 Performance budgets

| Asset/operation | Budget |
|---|---:|
| Initial Side Panel compressed JS | Target ≤ 250 KiB; hard warning 350 KiB |
| Initial CSS | ≤ 60 KiB compressed |
| Interaction blocking task | < 50 ms target |
| Selection capture p75 | < 150 ms |
| Article extraction p75 | < 800 ms |
| Local search p75 at 10k artifacts | < 200 ms |

Lazy-load Shiki languages, export engines, analytics charts, and rare settings. Profile before virtualization. Prevent request waterfalls with route/query prefetch where justified.

## 10. Git, Review, and Documentation

Branches are short-lived. Commits are coherent and use conventional type/scope. Pull requests state problem, solution, screenshots for UI, tests, privacy/security impact, permissions, schema/migration impact, performance, and rollback. Reviewers focus on invariants and failure paths before style.

Required checks include format, lint, typecheck, unit/contract tests, affected integration/E2E, architecture boundaries, schema compatibility, prompt evaluations when affected, accessibility smoke, bundle budget, dependency/license/secret scans, and docs links. Comments explain why and constraints, not syntax. Public contracts and surprising tradeoffs receive documentation or an ADR.

## 11. Examples

An operation state is a union of `queued`, `preparing`, `streaming`, and terminal variants, each carrying only valid fields. This prevents a “completed” record with an error or a “queued” record with final usage.

An API route validating an artifact does not trust a typed client. It validates wire schema, authenticates, verifies source/artifact ownership, calls the use case, and returns a versioned DTO. The repository independently enforces atomic revision matching.

## 12. Best Practices

- Optimize for the next reader and the failure path.
- Use schemas at trust boundaries and types within trusted code.
- Keep dependency direction visible and enforceable.
- Make cancellation, retry, and idempotency part of API design.
- Prefer small scenario fixtures over broad brittle snapshots.
- Remove dead flags, adapters, prompts, and migrations after compatibility windows.

## 13. Design Decisions

Strict TypeScript and Zod are complementary: types protect authored code, schemas protect runtime data. Repository and provider ports prevent framework/vendor lock-in. Risk-based coverage avoids gaming a universal number. Bundle budgets matter because the Side Panel should feel immediate on student hardware.

## 14. Engineering Notes

Pin toolchain versions through the lockfile and runtime policy. CI runs on a case-sensitive environment despite Windows/macOS development. Source maps are private production artifacts. Dependency updates are grouped by risk; major framework/provider SDK updates receive focused regression plans. Chrome Web Store packages are built only in trusted CI.

## 15. Future Improvements

Adopt automated API diffing, mutation testing for critical policy, browser performance regression labs, dependency provenance attestations, accessibility component contracts, and repository-level refactoring metrics as scale warrants.
