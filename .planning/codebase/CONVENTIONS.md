# Conventions

> Code style, naming patterns, and documentation standards

**Generated:** 2026-01-06

---

## Code Style

### Formatting
- **Indentation:** 2 spaces
- **Quotes:** Single quotes (`'value'`)
- **Semicolons:** Required
- **Line length:** No strict limit (reasonable ~120 chars)
- **Blank lines:** Single blank line between logical sections

### Module System
- ES modules (import/export)
- `node:` prefix for Node built-ins: `import { readFile } from 'node:fs/promises'`
- `.js` extensions in relative imports: `import { foo } from './file.js'`

### Example
```typescript
// From packages/cli/src/core/baseline.ts
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BaselineData } from '../types/index.js';

// =============================================================================
// Path Constants
// =============================================================================

const SYNKIO_DIR = 'synkio';
```

---

## Naming Conventions

### Files & Directories
| Type | Convention | Example |
|------|------------|---------|
| Modules | kebab-case | `file-writer.ts`, `collection-matcher.ts` |
| Commands | kebab-case | `init-baseline.ts`, `export-baseline.ts` |
| Directories | kebab-case | `core/compare/`, `core/import/` |
| Test files | `.test.ts` suffix | `tokens.test.ts` |
| Index files | `index.ts` | Barrel exports |

### Code
| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `collectionConfig`, `filesByDir` |
| Functions | camelCase | `filterPhantomModes()`, `generateFilename()` |
| Constants | UPPER_SNAKE_CASE | `SYNKIO_DIR`, `CONFIG_FILE` |
| Classes | PascalCase | `FigmaClient`, `ConsoleLogger` |
| Types/Interfaces | PascalCase | `BaselineData`, `MergeResult` |
| Schemas | PascalCase + Schema | `SynkioTokenEntrySchema` |

---

## Import Organization

Order imports in this sequence:

```typescript
// 1. Node built-ins
import { readFile } from 'node:fs/promises';

// 2. Third-party packages
import chalk from 'chalk';
import { z } from 'zod';

// 3. Local imports
import { BaselineData } from '../types/index.js';

// 4. Type imports
import type { Config } from './config.js';
```

---

## Comment Style

### Section Headers
```typescript
// =============================================================================
// Path Constants
// =============================================================================
```

### JSDoc for Public Functions
```typescript
/**
 * Detects phantom Figma modes (internal IDs like "21598:4")
 *
 * @param mode - The mode name to check
 * @returns true if the mode is a phantom mode
 */
export const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);
```

### Inline Comments
```typescript
const result = processTokens(data);  // Normalize before comparison
```

---

## TypeScript Configuration

**Key Settings** (`packages/cli/tsconfig.json`):
- `target`: ES2022
- `module`: NodeNext
- `strict`: true
- `sourceMap`: false
- `declaration`: false

**Test Exclusion:**
```json
{
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Patterns

### Error Handling
```typescript
try {
  const data = await readFile(path, 'utf-8');
  return JSON.parse(data);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return null;  // File not found is expected
  }
  throw error;  // Re-throw unexpected errors
}
```

### Optional Parameters
```typescript
export function createClient(options: {
  token: string;
  timeout?: number;  // Optional with default
  silent?: boolean;
}): Client {
  const timeout = options.timeout ?? 120000;
  // ...
}
```

### Type Guards
```typescript
function isBaselineEntry(value: unknown): value is BaselineEntry {
  return typeof value === 'object' && value !== null && '$value' in value;
}
```

---

## Linting & Formatting

**Status:** No automated tools configured

Code style is enforced through:
- TypeScript strict mode
- Team conventions
- Code review

**Missing (potential additions):**
- `.eslintrc` - Not present
- `.prettierrc` - Not present
- `.editorconfig` - Not present
