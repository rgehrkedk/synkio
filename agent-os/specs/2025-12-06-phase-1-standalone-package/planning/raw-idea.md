# Raw Feature Idea

**Feature Name:** Phase 1A Context System

**Description:**
Create a context system to eliminate hard-coded paths in @synkio/core package and make it framework-agnostic. This is the critical first step (Phase 1A) for extracting the package from Clarity codebase.

**Current Blocker:**
All file paths are hard-coded to `figma-sync/.figma/` which prevents the package from working as a standalone NPM package.

**Goal:**
Implement a context system that allows dynamic path resolution based on configuration, supporting both CLI and programmatic API usage.

**Key Components:**
1. Context system (`src/context.ts`)
2. Environment variable lazy loading (`src/env.ts`)
3. Refactor path constants to functions (`src/files/paths.ts`)
4. Update all imports across ~33 TypeScript files

**Reference Documents:**
- The project has existing documentation in `docs/PHASE_1_DEEP_DIVE.md`
- The project has existing documentation in `docs/PRODUCT_PLAN.md`
- Existing spec folder at `agent-os/specs/phase-1-context-system/` with spec.md and requirements.md (these were created manually, but you should create your own dated spec folder following Agent OS conventions)
