## Coding style best practices

### TypeScript & Node.js Specific
- **Strict TypeScript**: Use TypeScript strict mode, always define types explicitly
- **Type Exports**: Export types separately with `export type` for better tree-shaking
- **ESM Modules**: Use ES modules (`import/export`), not CommonJS (`require`)
- **No Any Types**: Avoid `any` - use `unknown`, proper types, or generics instead
- **Path Aliases**: Avoid framework-specific path aliases (e.g., `@/` from Next.js). Use relative imports or standard Node.js resolution

### General Coding Standards
- **Consistent Naming Conventions**:
  - **Files**: kebab-case (e.g., `token-sync.ts`, `figma-api.ts`)
  - **Functions/Variables**: camelCase (e.g., `fetchFigmaData`, `baselinePath`)
  - **Types/Interfaces**: PascalCase (e.g., `TokensConfig`, `BaselineData`)
  - **Constants**: UPPER_SNAKE_CASE (e.g., `FIGMA_API_URL`)
- **Automated Formatting**: Prettier configured at root (2 spaces, no semicolons by preference)
- **Meaningful Names**: Choose descriptive names that reveal intent; avoid abbreviations except standard ones (e.g., `ctx` for context, `err` for error)
- **Small, Focused Functions**: Keep functions under 50 lines; extract complex logic into helper functions
- **Consistent Indentation**: 2 spaces (enforced by Prettier)
- **Remove Dead Code**: Delete unused code, commented-out blocks, and imports rather than leaving them as clutter
- **Framework Agnostic**: Core package must not depend on Next.js, React, or any web framework
- **Backward Compatibility**: Not required unless explicitly stated (we're in 0.x versions)
- **DRY Principle**: Avoid duplication by extracting common logic into reusable functions or modules

### Package-Specific Conventions
- **Context System**: Always use context system for path resolution (never hard-code paths)
- **Environment Variables**: Lazy-load env vars, never load at module import time
- **Error Messages**: Provide actionable error messages with suggestions (e.g., "Run 'synkio init' to create config")
- **CLI Output**: Use chalk (colors), ora (spinners), boxen (boxes) for better UX
- **Exports**: Clearly separate CLI (`src/cli/`), API (`src/api/`), and Core (`src/core/`) exports
