## Tech stack

Synkio is a monorepo for designer-first design token synchronization from Figma to code.

### Monorepo Structure
- **Monorepo Manager:** Turborepo
- **Package Manager:** pnpm (>=9.0.0)
- **Language/Runtime:** TypeScript, Node.js (>=18.0.0)

### Packages

#### @synkio/core (NPM Package)
- **Type:** Node.js CLI + Programmatic API
- **Purpose:** Sync Figma design tokens to code
- **Key Dependencies:**
  - commander (CLI framework)
  - inquirer (interactive prompts)
  - chalk, ora, boxen, cli-table3 (CLI UX)
  - dotenv (environment variables)
  - glob (file pattern matching)
  - style-dictionary (token compilation)

#### plugin-export (Figma Plugin)
- **Purpose:** Token Vault - Export Figma Variables to node data
- **Tech:** TypeScript, Figma Plugin API

#### plugin-import (Figma Plugin)
- **Purpose:** Token Importer - Import JSON tokens to Figma
- **Tech:** TypeScript, Figma Plugin API

#### dashboard (Next.js App)
- **Framework:** Next.js 15 (App Router)
- **Frontend:** React 19
- **Purpose:** Web dashboard at synkio.io for visual token preview
- **Styling:** CSS Modules (NOT Tailwind)
- **Planned UI:** Radix UI components

### Testing & Quality
- **Test Framework:** Vitest (for @synkio/core)
- **Linting/Formatting:** Prettier
- **Type Checking:** TypeScript strict mode

### Deployment & Infrastructure
- **Core Package:** NPM registry
- **Dashboard:** Vercel (planned)
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub (private repo)

### Third-Party Services
- **Design Tool Integration:** Figma REST API
- **Token Processing:** Style Dictionary (optional for users)

### Current Phase
**Phase 1: Standalone NPM Package Extraction**

**Current State:**
- Code has been copied from Clarity to `packages/core/src/`
- Structure exists: CLI commands (setup, sync, diff, rollback), core logic, types
- **Problem:** All paths are hard-coded to `figma-sync/.figma/` (Clarity-specific)
- **Blocker:** Package cannot work standalone until paths are abstracted

**Immediate Goals:**
1. Create context system to eliminate hard-coded paths (`packages/core/src/context.ts`)
2. Refactor `src/files/paths.ts` to use context (convert constants → functions)
3. Fix environment variable loading (no side effects at import time)
4. Update all imports across ~33 TypeScript files
5. Create programmatic API (`src/api/index.ts`)
6. Build and test locally

**NOT Yet Done:**
- Context system (critical blocker)
- CLI with commander/inquirer (exists as basic readline, needs upgrade)
- Programmatic API exports
- Framework-agnostic validation
- NPM publishing

**Files to Focus On:**
- `src/files/paths.ts` - Hard-coded paths (MUST FIX FIRST)
- `src/figma/constants.ts` - Side effects at import (MUST FIX)
- `src/cli/commands/*.ts` - Uses hard-coded paths
- All 33 TS files that import from paths.ts
