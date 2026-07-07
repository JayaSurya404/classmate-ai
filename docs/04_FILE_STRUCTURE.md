# ClassMate AI — File and Module Structure

**Version:** 1.0.0  
**Purpose:** Define the monorepo layout, package ownership, dependency direction, naming, configuration, testing placement, and rules for adding or moving files.

## Table of Contents

1. [Repository Strategy](#1-repository-strategy)
2. [Canonical Tree](#2-canonical-tree)
3. [Extension Application](#3-extension-application)
4. [API Application](#4-api-application)
5. [Shared Packages](#5-shared-packages)
6. [Tests, Tooling, and Documentation](#6-tests-tooling-and-documentation)
7. [Naming and Imports](#7-naming-and-imports)
8. [Ownership and Change Rules](#8-ownership-and-change-rules)
9. [Examples](#9-examples)
10. [Best Practices](#10-best-practices)
11. [Design Decisions](#11-design-decisions)
12. [Engineering Notes](#12-engineering-notes)
13. [Future Improvements](#13-future-improvements)

## 1. Repository Strategy

Use a workspace monorepo. Applications are deployable composition roots; packages are cohesive libraries with explicit public APIs. Feature folders group behavior vertically. Generic `utils`, `helpers`, `common`, and `misc` dumping grounds are prohibited. The tree describes intended ownership, not a requirement to pre-create empty files.

## 2. Canonical Tree

```text
classmate-ai/
├─ apps/
│  ├─ extension/
│  │  ├─ public/                 # icons, manifest inputs, bundled static assets
│  │  ├─ src/
│  │  │  ├─ entries/             # side-panel, service-worker, content-script roots
│  │  │  ├─ app/                 # providers, router, shell, initialization
│  │  │  ├─ features/            # study, library, practice, settings, onboarding
│  │  │  ├─ components/          # project-wide semantic UI components
│  │  │  ├─ adapters/            # chrome, local-db, http, direct-ai, export
│  │  │  ├─ extraction/          # generic and site-family extractors
│  │  │  ├─ stores/              # small cross-feature transient UI stores
│  │  │  ├─ styles/              # semantic tokens and global styles
│  │  │  └─ testing/             # extension-specific fixtures and harnesses
│  │  └─ tests/e2e/
│  └─ web/
│     ├─ src/app/                # Next.js routes, pages, handlers
│     ├─ src/modules/            # backend bounded modules
│     ├─ src/infrastructure/     # db, auth, telemetry, queues, provider adapters
│     ├─ src/jobs/               # cleanup, reminders, privacy, migration runners
│     └─ tests/integration/
├─ packages/
│  ├─ domain/                    # dependency-free entities, ports, policies
│  ├─ contracts/                 # Zod wire/storage/event schemas
│  ├─ ai-core/                   # provider contract, router and normalizers
│  ├─ prompt-library/            # versioned templates and output schemas
│  ├─ content-core/              # blocks, chunking, anchors, token budgets
│  ├─ ui/                        # owned shadcn primitives and tokens
│  ├─ config/                    # shared lint/ts/test/build presets
│  └─ test-kit/                  # factories, contract suites, fake clocks/providers
├─ docs/                         # this specification set and ADRs
├─ tooling/                      # repository-only scripts and policy checks
├─ .github/                      # workflows and templates
├─ package.json
├─ workspace configuration
└─ lockfile
```

## 3. Extension Application

### 3.1 Entry points

Each runtime entry is a composition root and contains no reusable business logic. `side-panel` mounts React and providers; `service-worker` registers Chrome listeners synchronously and delegates; `content-script` registers the validated message dispatcher. Entry-specific Vite configuration produces CSP-compliant bundles.

### 3.2 Feature anatomy

```text
features/study/
├─ components/       # Study-only rendering and controls
├─ hooks/            # UI orchestration hooks
├─ application/      # Study use cases and commands
├─ domain/           # Feature-local policies not shared globally
├─ queries/          # TanStack query keys/options
├─ state/            # Feature-local transient state
├─ schemas/          # UI/form schemas; wire schemas remain in contracts
├─ routes/           # Route-level composition
├─ testing/          # factories and feature fixtures
└─ index.ts           # deliberately small public surface
```

Components may import their feature’s hooks/application API, semantic UI, domain/contracts, and approved platform abstractions. They may not import Chrome globals, IndexedDB implementations, provider SDKs, or another feature’s internals.

### 3.3 Extraction

`extraction/core` owns sanitization, block normalization, anchors, and the extractor contract. `extraction/adapters/generic`, `pdf`, `youtube`, `github`, `documentation`, and `lms` implement detection and extraction. Domain-specific adapters never contain credentials or network circumvention. Fixture HTML is synthetic or licensed and stripped of personal data.

## 4. API Application

Next.js `app/api/v1/.../route.ts` files perform HTTP mapping only. Bounded modules follow:

```text
modules/library/
├─ domain/            # aggregates, policies, repository ports
├─ application/       # commands, queries, DTO mapping
├─ infrastructure/    # Mongoose schemas/repositories
├─ presentation/      # route-facing request/response mapping
├─ events/            # event definitions and handlers
├─ testing/
└─ index.ts
```

Infrastructure depends on application/domain contracts, not the reverse. Models are registered through a safe registry to tolerate Next.js development reloads. Jobs call application services rather than writing collections directly.

## 5. Shared Packages

| Package | Allowed dependencies | Forbidden contents |
|---|---|---|
| `domain` | Standard TypeScript only | React, Chrome, Mongoose, SDKs, environment reads |
| `contracts` | Zod, domain value types | Database models, UI behavior |
| `ai-core` | domain/contracts, minimal streaming utilities | Vendor SDK imports outside adapters |
| `prompt-library` | contracts, template engine | UI text, provider secrets |
| `content-core` | domain/contracts, tokenizer ports | DOM globals in shared logic |
| `ui` | React, Tailwind/shadcn peers | Product use cases, HTTP, Chrome APIs |
| `test-kit` | Test-only dependencies | Production imports from applications |

Every package has a manifest, TypeScript configuration, README describing public API, `src/index.ts`, tests, and explicit exports. Internal paths are not importable by consumers.

## 6. Tests, Tooling, and Documentation

Unit tests are colocated as `*.test.ts(x)` when they explain the implementation. Contract and integration suites live in named test roots because they span modules. E2E tests live under the deployable app. Snapshots are limited to stable serialized contracts or small accessible DOM structures; large UI snapshots are prohibited.

Tooling includes manifest validation, architecture dependency checks, schema compatibility, dead-code analysis, license and secret scanning, prompt evaluation, bundle-size budgets, documentation link checking, and release packaging. Generated reports go to ignored artifacts, never source directories.

## 7. Naming and Imports

| Item | Convention | Example |
|---|---|---|
| React component | PascalCase file and symbol | `ContextBar.tsx` |
| Hook | camelCase with `use` | `useGeneration.ts` |
| Use case | verb + object | `generateArtifact.ts` |
| Domain type | singular PascalCase | `SourceSnapshot` |
| Zod schema | noun + `Schema` | `ArtifactSchema` |
| Repository port | noun + `Repository` | `ArtifactRepository` |
| Adapter | technology + role | `MongoArtifactRepository` |
| Test | subject + `.test`/`.spec` | `routeFreeFirst.test.ts` |
| Constant | semantic camelCase locally; uppercase only true globals | `defaultChunkBudget` |

Use workspace aliases only at package boundaries. Relative imports are preferred within a feature. Barrel files expose stable APIs but do not recursively re-export everything. Filename case is exact across platforms.

## 8. Ownership and Change Rules

CODEOWNERS assigns at least extension, backend, AI/prompts, security/privacy, and design-system ownership. A change to a shared contract includes producer/consumer compatibility evidence. File moves preserve history and update docs/import rules. New top-level folders or cross-package dependencies require an architecture review. Feature deletion includes migrations, flag removal, telemetry cleanup, and documentation updates.

## 9. Examples

A new `mind-map` artifact adds its schema to contracts, domain representation to domain, prompt/output mapping to prompt-library, renderer under the Study feature, exporter mapping in its adapter, and contract/evaluation fixtures. It does not add mind-map logic to a global utility file.

A new Groq protocol version changes only the Groq adapter and model catalog unless the normalized capability contract itself changes. Provider response types do not cross into UI code.

## 10. Best Practices

- Place code with the behavior that changes for the same reason.
- Keep composition roots explicit and business modules platform-agnostic.
- Use a package only when it creates a real ownership or runtime boundary.
- Delete obsolete compatibility layers after the supported upgrade window.
- Keep fixtures small, named by scenario, and free of sensitive real content.

## 11. Design Decisions

Vertical feature slices reduce scattered changes, while shared domain/contracts prevent wire-format drift. A separate `apps/web` name accommodates both API and limited account/share pages without implying a second product dashboard. There is no universal `shared` folder because ownership becomes ambiguous.

## 12. Engineering Notes

CI should derive an import graph and reject cycles, forbidden platform imports, deep package paths, and backend-to-extension dependencies. Vite receives separate builds for extension entries. Server-only modules use explicit server-only guards. Public package exports distinguish runtime code from types to minimize extension bundles.

## 13. Future Improvements

As the team grows, packages may gain independent change logs and ownership dashboards. A schema registry, generated dependency map, affected-test selection, and automated module scaffolder can standardize expansion without pre-creating speculative abstractions.
