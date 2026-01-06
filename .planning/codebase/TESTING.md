# Testing

> Test framework, structure, and practices

**Generated:** 2026-01-06

---

## Framework

**Vitest 2.0+**

Configuration: `packages/cli/vitest.config.ts`, `packages/figma-plugin/synkio-v2/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

---

## Test Organization

### Co-located Tests
Tests live alongside source files:

| Source | Test |
|--------|------|
| `src/core/tokens.ts` | `src/core/tokens.test.ts` |
| `src/utils/figma.ts` | `src/utils/figma.test.ts` |
| `src/core/import/parser.ts` | `src/core/import/parser.test.ts` |

### Mock Files
Centralized in `src/__mocks__/`:
- `packages/figma-plugin/synkio-v2/src/__mocks__/figma.ts`

---

## Test Structure

### Basic Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { parseImportFiles } from './parser.js';

describe('parser', () => {
  it('should parse valid import files', () => {
    const result = parseImportFiles(input);
    expect(result).toHaveLength(1);
  });
});
```

### With Setup
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('file-writer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create directories', async () => {
    // test body
  });
});
```

### Mocking
```typescript
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  mkdir: (...args: any[]) => mockMkdir(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
}));
```

---

## Running Tests

### NPM Scripts
```bash
npm run test              # Single run
npm run test:watch        # Watch mode
```

### Filtering
```bash
# Run specific file
npm run test -- src/core/compare/compare.test.ts

# Run matching pattern
npm run test -- --testNamePattern="should detect"
```

---

## Coverage

**Provider:** v8
**Reporters:** text, html

### Exclusions
- `src/**/*.test.ts` - Test files
- `src/__mocks__/**` - Mocks
- `src/ui/**` - UI code (hard to test without DOM)

---

## Test Files by Module

| Module | Test Files |
|--------|------------|
| `core/compare/` | 5 tests (collection-matcher, variable-comparator, utils, report-generator, console-display) |
| `core/import/` | 4 tests (parser, validator, source-resolver, file-generator) |
| `core/sync/` | 6 tests (file-writer, build-runner, breaking-changes, style-merger, display, regenerate) |
| `core/tokens/` | 4 tests (split-strategies, filename-generator, token-builder, reference-resolver) |
| Total | ~32 test files |

---

## Test Categories

### Unit Tests (Majority)
- Located alongside source files
- Test individual functions/modules
- Fast, isolated execution

**Examples:**
- `src/core/tokens.test.ts` - Token processing
- `src/core/compare/collection-matcher.test.ts` - Matching logic
- `src/core/tokens/filename-generator.test.ts` - Filename generation

### Integration Tests
- Test command flows end-to-end
- Located in command directories

**Examples:**
- `src/cli/commands/integration.test.ts`
- `src/cli/commands/init.test.ts`

---

## Helper Patterns

### Test Data Builders
```typescript
function createBaseline(entries: Array<{
  variableId: string;
  path: string;
  value: unknown;
  collection: string;
  mode: string;
}>): BaselineData {
  const baseline: Record<string, unknown> = {};
  for (const entry of entries) {
    const key = `${entry.collection}/${entry.mode}/${entry.path}`;
    baseline[key] = { /* ... */ };
  }
  return { baseline, metadata: { /* ... */ } };
}
```

---

## Coverage Gaps

**Areas with limited test coverage:**
- `src/cli/bin.ts` - Command routing/argument parsing
- `src/core/sync/pipeline.ts` - Complex orchestration
- `src/core/docs/css-generator.ts` - CSS generation
- Error handling edge cases
