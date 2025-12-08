# Spec Initialization: Top 5 Priorities for Synkio

**Date:** 2025-12-07

## Raw Idea

Implement the top 5 critical improvements to the Synkio codebase to improve reliability, maintainability, and developer experience.

## Context
Synkio is a designer-first design token synchronization tool that syncs Figma Variables to code. It's a monorepo containing:
- `@synkio/core` - NPM package (CLI + programmatic API)
- `dashboard` - Next.js web app
- `token-vault` - Figma plugin

## The 5 Priorities to Implement

### 1. Centralized Config Schema Validation (CRITICAL)
- Replace manual validation with Zod schema validation
- Add type coercion, nested validation, env var validation
- Add migration path for config versions
- Export type-safe ResolvedConfig type

### 2. Figma Client Resilience (CRITICAL)
- Create FigmaClient class with retry logic using p-retry
- Handle 429 rate limits with exponential backoff
- Add timeout support (30s default)
- Implement structured logging with request IDs
- Add circuit breaker pattern

### 3. Migration Engine Hardening (HIGH PRIORITY)
- Replace regex-based migrations with AST parsing
- CSS/SCSS: Use css-tree or postcss for var() context
- TypeScript/JS: Use TypeScript compiler API for AST
- Add safety rails: backups, dry-run, max replacements per file
- Add idempotency checking with migration history
- Add preview functionality with side-by-side diffs

### 4. Logging/UX Separation (Orchestrator Pattern) (HIGH PRIORITY)
- Extract business logic into orchestrator classes
- Implement event-based architecture
- Create separate renderers: SyncRenderer (pretty UI) and JsonRenderer (CI/headless)
- Make CLI commands thin wrappers
- Enable programmatic API usage

### 5. Context-First FS (Finish What's Started) (MEDIUM)
- Extend Context interface with FSAdapter abstraction
- Create NodeFSAdapter (real FS) and MemoryFSAdapter (tests)
- Fix all process.cwd() leaks throughout codebase
- Add RestrictedFSAdapter for security/sandboxing
- Enable testability, monorepo support, and dry-run mode

## Implementation Order
1. Config validation (2-4 hours)
2. Figma client (3-4 hours)
3. Logging separation (3-5 days)
4. Context FS (2-3 days)
5. Migration hardening (1-2 weeks)

Total estimated effort: 3-4 weeks

## Key Technical Details
- The codebase is located at /Users/rasmus/synkio
- Core package at packages/core/src/
- Uses TypeScript, pnpm workspaces, Turborepo
- Already has Context system started (context.ts)
- Uses Commander.js for CLI
- Has existing token migration system that needs hardening
