## General development conventions

### Synkio-Specific Conventions

**Current Phase: Phase 1 - Standalone NPM Package Extraction**

The immediate goal is to extract `packages/core/` into a standalone, framework-agnostic NPM package (@synkio/core) that can be published and used independently.

**Critical Phase 1 Requirements:**
1. **Context System**: Create a context system to eliminate all hard-coded paths (see `docs/PHASE_1_DEEP_DIVE.md`)
2. **Framework Agnostic**: Remove all Next.js/React dependencies and path aliases (e.g., `@/`)
3. **Path Resolution**: Convert all path constants to functions that use the context system
4. **Environment Variables**: Lazy-load environment variables (no side effects at import time)
5. **Dual Usage**: Support both CLI usage and programmatic API usage

**Current Package Structure (Existing):**
```
packages/core/src/
├── adapters/         ✅ Exists - Transform adapters (Tailwind, CSS vars)
├── cli/
│   ├── commands/     ✅ Exists - setup.ts, sync.ts, diff.ts, rollback.ts
│   ├── prompt.ts     ✅ Exists - Basic readline prompts
│   └── index.ts      ✅ Exists - Basic CLI entry
├── compare/          ✅ Exists - Diff engine
├── detect/           ✅ Exists - Project detection & scaffolding
├── figma/            ✅ Exists - Figma API integration
│   ├── api.ts
│   ├── parser.ts
│   └── constants.ts  ⚠️  Side effects at import (MUST FIX)
├── files/            ✅ Exists - File operations
│   ├── loader.ts
│   ├── paths.ts      ⚠️  Hard-coded paths (BLOCKING ISSUE)
│   └── index.ts
├── style-dictionary/ ✅ Exists - Style Dictionary integration
├── tokens/           ✅ Exists - Token processing, splitting, migration
└── types/            ✅ Exists - TypeScript type definitions
```

**What DOES NOT Exist Yet:**
- ❌ `src/context.ts` - Context system (CRITICAL, MUST CREATE)
- ❌ `src/api/index.ts` - Programmatic API exports
- ❌ Modern CLI with commander/inquirer (exists as basic readline)
- ❌ `templates/` directory with config templates

**Do NOT:**
- Use Next.js-specific imports or path aliases
- Hard-code any file paths
- Have side effects at module import time
- Depend on React, Next.js, or web frameworks

**DO:**
- Use context system for all path resolution
- Lazy-load environment variables
- Write clear, actionable error messages
- Keep functions small and testable

### General Project Conventions

- **Consistent Project Structure**: Monorepo with Turborepo + pnpm workspaces
- **Clear Documentation**: Reference `docs/PHASE_1_DEEP_DIVE.md` for implementation details
- **Version Control Best Practices**: Use clear commit messages following conventional commits pattern
- **Environment Configuration**: Use environment variables for configuration; never commit secrets or API keys to version control
- **Dependency Management**: Keep dependencies minimal; core package should work standalone
- **Testing Requirements**: Unit tests with Vitest for core functionality
- **Pre-1.0 Status**: Breaking changes are acceptable (0.x version)
- **Changelog Maintenance**: Track changes in git commits; formal changelog when stable
