# Contribution Guide

## Before opening a change

1. Read the architecture and coding standards in `docs`.
2. Keep existing package boundaries intact.
3. Add or update tests for behavior changes.
4. Run `pnpm check`.

## Code style

Use strict TypeScript, small modules, reusable hooks/services/components, Zod validation at boundaries, and safe logging. Do not log provider keys, student content, or raw authorization values.

## Pull request checklist

- Typecheck passes.
- Build passes.
- Tests pass.
- Extension manifest remains Manifest V3.
- Accessibility and keyboard behavior are preserved.
- Documentation is updated when behavior changes.
