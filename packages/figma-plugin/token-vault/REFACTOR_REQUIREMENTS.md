# Token Vault Refactoring Requirements

## Executive Summary

The token-vault Figma plugin requires a comprehensive refactoring to improve maintainability, testability, and scalability. Currently, all backend logic (820 lines) exists in a single `code.ts` file, and all frontend code (1357 lines) is inline within `ui.html`. This document outlines the current state, proposed architecture, and migration strategy.

---

## 1. Current State Analysis

### Backend (`src/code.ts` - 820 lines)

**Responsibilities Mixed in Single File:**
- Message handling (figma.ui.onmessage) - lines 54-157
- Import logic (createVariableCollection, importTokensForMode) - lines 159-242
- Type inference (inferTypeFromPath) - lines 279-340 (60+ lines of hardcoded logic)
- Token parsing (parseTokenValue, parseColor, parseNumber, parseFontWeight) - lines 423-532
- Alias resolution (resolveAliases) - lines 541-576
- Export logic (exportBaselineSnapshot) - lines 632-705
- Sync to node logic (syncRegistryToNode, getLastSyncInfo) - lines 717-819
- Type definitions and interfaces - lines 4-45

**Problems Identified:**
1. No separation of concerns - business logic mixed with Figma API calls
2. Not testable - all functions depend on Figma global API
3. Type inference hardcoded with 60+ lines of pattern matching
4. Duplicate code between import/export flows
5. No error handling strategy
6. Magic strings and numbers scattered throughout
7. Global state (aliasReferences array) - line 535

### Frontend (`src/ui.html` - 1357 lines)

**Structure:**
- HTML structure (minimal, mostly divs)
- CSS styles (587 lines) - lines 6-593
- JavaScript logic (595 lines) - lines 760-1355

**Problems Identified:**
1. All code inline in single HTML file
2. No component separation
3. No type safety (vanilla JavaScript)
4. Global state management (files Map, collections array) - lines 762-767
5. No validation or error boundaries
6. CSS not modular or reusable
7. Event handlers scattered throughout

### Build System

**Current:**
- esbuild bundles `code.ts` to `code.js`
- UI stays as `src/ui.html` (referenced by manifest)
- No bundling for UI assets
- No separate dev/prod builds

**Limitations:**
- Cannot split backend into modules easily
- No TypeScript for UI
- No CSS preprocessing
- No asset optimization

---

## 2. Proposed Architecture

### 2.1 Backend Module Structure

```
src/
├── code.ts                    # Entry point (50-80 lines)
├── types/
│   ├── index.ts              # Re-exports all types
│   ├── tokens.ts             # Token-related types (TokenFile, TokenValue, etc.)
│   ├── baseline.ts           # Baseline types (BaselineSnapshot, BaselineEntry)
│   ├── messages.ts           # UI message types
│   └── figma.ts              # Figma-specific types/utilities
├── handlers/
│   ├── index.ts              # Message router
│   ├── import.handler.ts     # Handle import-tokens message
│   ├── export.handler.ts     # Handle export-baseline message
│   ├── sync.handler.ts       # Handle sync-to-node message
│   └── collections.handler.ts # Handle get-collections message
├── import/
│   ├── index.ts              # Main import orchestrator
│   ├── collection.ts         # Collection creation logic
│   ├── variable.ts           # Variable creation logic
│   ├── alias-resolver.ts     # Alias resolution (with proper state management)
│   └── mode-manager.ts       # Mode management logic
├── export/
│   ├── index.ts              # Main export orchestrator
│   ├── baseline.ts           # Baseline snapshot creation
│   ├── value-serializer.ts   # Serialize Figma values to JSON
│   └── structure-builder.ts  # Build nested token structure
├── sync/
│   ├── index.ts              # Main sync orchestrator
│   ├── node-manager.ts       # Find/create registry node
│   ├── chunk-storage.ts      # Handle 100KB chunking
│   └── metadata.ts           # Sync metadata management
├── parsing/
│   ├── index.ts              # Re-export all parsers
│   ├── token-parser.ts       # Parse token values
│   ├── color-parser.ts       # Color parsing logic
│   ├── number-parser.ts      # Number/dimension parsing
│   └── font-parser.ts        # Font weight/family parsing
├── type-inference/
│   ├── index.ts              # Main inference function
│   ├── patterns.ts           # Type inference patterns (data-driven)
│   └── rules.ts              # Inference rules engine
└── utils/
    ├── constants.ts          # All magic strings/numbers
    ├── defaults.ts           # Default values by type
    ├── validators.ts         # Input validation
    └── errors.ts             # Error classes and handling
```

**Rationale:**
- **Separation by feature** (import, export, sync) for clear boundaries
- **Handlers as thin layer** between UI messages and business logic
- **Type inference as data-driven** instead of hardcoded if/else chains
- **Utils for shared functionality** to reduce duplication
- **All testable** without Figma API (dependency injection)

### 2.2 Frontend Module Structure

**Option A: Keep Vanilla JS + Organize**
```
src/
├── ui.html                   # Minimal structure (loads bundled JS/CSS)
├── styles/
│   ├── index.css            # Main stylesheet (imports below)
│   ├── variables.css        # CSS custom properties
│   ├── layout.css           # Layout utilities
│   ├── components.css       # Component styles
│   └── animations.css       # Transitions and animations
└── ui/
    ├── index.js             # Entry point
    ├── state.js             # State management
    ├── tabs.js              # Tab switching logic
    ├── import-tab.js        # Import tab functionality
    ├── export-tab.js        # Export tab functionality
    ├── sync-tab.js          # Sync tab functionality
    ├── collections.js       # Collection management
    ├── file-upload.js       # File handling
    └── utils.js             # DOM helpers
```

**Option B: TypeScript UI (Recommended)**
```
src/
├── ui.html                   # Minimal structure
├── styles/                   # Same as Option A
└── ui/
    ├── index.ts             # Entry point
    ├── types.ts             # Shared UI types
    ├── state.ts             # Type-safe state management
    ├── tabs/
    │   ├── import-tab.ts
    │   ├── export-tab.ts
    │   └── sync-tab.ts
    ├── components/
    │   ├── file-upload.ts
    │   ├── collection-config.ts
    │   ├── collection-list.ts
    │   └── success-screen.ts
    └── utils/
        ├── dom.ts
        ├── formatting.ts
        └── messaging.ts
```

**Recommendation: Option B (TypeScript UI)**
- Type safety for UI state and messages
- Better IDE support and refactoring
- Shared types with backend (src/types/)
- Prevents runtime errors
- Better documentation through types

### 2.3 Shared Types Architecture

```
src/
├── types/
│   ├── index.ts             # Re-exports
│   ├── tokens.ts            # Used by both backend and UI
│   ├── messages.ts          # Message protocol types
│   └── state.ts             # UI state types
```

**Message Protocol Example:**
```typescript
// messages.ts - Shared between backend and UI

// Requests (UI → Backend)
export type GetCollectionsRequest = {
  type: 'get-collections';
};

export type ImportTokensRequest = {
  type: 'import-tokens';
  data: {
    collections: CollectionConfig[];
  };
};

// ... more requests

// Responses (Backend → UI)
export type CollectionsLoadedResponse = {
  type: 'collections-loaded';
  collections: CollectionInfo[];
};

export type ImportCompleteResponse = {
  type: 'import-complete';
  message: string;
};

// ... more responses

// Union types for type safety
export type UIRequest =
  | GetCollectionsRequest
  | ImportTokensRequest
  | ExportBaselineRequest
  | SyncToNodeRequest
  | CancelRequest;

export type BackendResponse =
  | CollectionsLoadedResponse
  | ImportCompleteResponse
  | ImportErrorResponse
  | ExportCompleteResponse
  | SyncCompleteResponse;
```

---

## 3. Key Architectural Decisions

### 3.1 Backend Bundling Strategy

**Decision: Single Bundle with Internal Modules**

- Keep esbuild bundling everything to `code.js`
- Use ES modules internally during development
- Tree-shaking removes unused code
- No runtime module loader needed

**Justification:**
- Figma requires single entry point
- No performance issues with single bundle
- Simpler deployment and debugging
- esbuild handles optimization

### 3.2 Type Inference Refactoring

**Current Problem:**
```typescript
// 60+ lines of hardcoded if/else
function inferTypeFromPath(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('color')) return 'color';
  if (lowerPath.includes('spacing')) return 'dimension';
  // ... 50+ more lines
}
```

**Proposed Solution: Data-Driven Patterns**
```typescript
// type-inference/patterns.ts
export const TYPE_PATTERNS: TypePattern[] = [
  {
    type: 'color',
    prefixes: ['color', 'colors', 'colours', 'brand', 'semantic'],
    keywords: ['background', 'foreground', 'border', 'fill', 'stroke'],
    priority: 1
  },
  {
    type: 'dimension',
    prefixes: ['spacing', 'space', 'size', 'radius'],
    keywords: ['padding', 'margin', 'gap'],
    priority: 2
  },
  // ... rest as data
];

// type-inference/rules.ts
export function inferType(path: string, patterns: TypePattern[]): string {
  const segments = path.toLowerCase().split('/');
  const firstSegment = segments[0];

  // Sort patterns by priority
  const sorted = patterns.sort((a, b) => a.priority - b.priority);

  for (const pattern of sorted) {
    // Check prefix match
    if (pattern.prefixes.includes(firstSegment)) {
      return resolveSubType(path, pattern);
    }

    // Check keyword match
    if (pattern.keywords.some(kw => path.includes(kw))) {
      return pattern.type;
    }
  }

  return 'string'; // default
}
```

**Benefits:**
- Easy to add new patterns without code changes
- Testable with simple data fixtures
- Could be externalized to JSON config later
- Clear priority system for conflicts

### 3.3 Alias Resolution State Management

**Current Problem:**
```typescript
// Global mutable state
const aliasReferences: Array<{...}> = [];
```

**Proposed Solution: Encapsulated State**
```typescript
// import/alias-resolver.ts
export class AliasResolver {
  private references: AliasReference[] = [];

  registerAlias(variable: Variable, modeId: string, aliasPath: string): void {
    this.references.push({ variable, modeId, aliasPath });
  }

  async resolveAll(variableMap: Map<string, Variable>): Promise<AliasResult> {
    const resolved: Variable[] = [];
    const failed: AliasError[] = [];

    for (const ref of this.references) {
      try {
        const target = this.findTarget(ref.aliasPath, variableMap);
        ref.variable.setValueForMode(ref.modeId, {
          type: 'VARIABLE_ALIAS',
          id: target.id
        });
        resolved.push(ref.variable);
      } catch (error) {
        failed.push({ reference: ref, error });
      }
    }

    this.references = []; // Clear after resolution

    return { resolved, failed };
  }
}
```

### 3.4 Error Handling Strategy

**Standardized Error Classes:**
```typescript
// utils/errors.ts
export class TokenVaultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TokenVaultError';
  }
}

export class ParseError extends TokenVaultError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PARSE_ERROR', context);
    this.name = 'ParseError';
  }
}

export class ImportError extends TokenVaultError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'IMPORT_ERROR', context);
    this.name = 'ImportError';
  }
}

// ... more error classes
```

**Usage in Handlers:**
```typescript
// handlers/import.handler.ts
try {
  await importTokens(msg.data.collections);
  figma.ui.postMessage({
    type: 'import-complete',
    message: 'Tokens imported successfully!'
  });
} catch (error) {
  const errorMessage = error instanceof TokenVaultError
    ? error.message
    : 'Unknown error occurred';

  console.error('Import failed:', error);

  figma.ui.postMessage({
    type: 'import-error',
    message: errorMessage,
    code: error instanceof TokenVaultError ? error.code : 'UNKNOWN',
    context: error instanceof TokenVaultError ? error.context : undefined
  });
}
```

### 3.5 Testing Strategy

**Backend Tests (Vitest):**
```typescript
// import/variable.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createVariable } from './variable';

describe('createVariable', () => {
  it('should create color variable with correct value', async () => {
    // Mock Figma API
    const mockCollection = { /* ... */ };
    const mockVariable = { /* ... */ };

    const result = await createVariable(
      mockCollection,
      'mode-1',
      'colors/primary',
      { value: '#ff0000', type: 'color' }
    );

    expect(result).toBeDefined();
    expect(result.resolvedType).toBe('COLOR');
  });

  // ... more tests
});
```

**Type Inference Tests:**
```typescript
// type-inference/rules.test.ts
import { describe, it, expect } from 'vitest';
import { inferType } from './rules';
import { TYPE_PATTERNS } from './patterns';

describe('inferType', () => {
  it.each([
    ['colors/primary', 'color'],
    ['spacing/base', 'dimension'],
    ['font/family/primary', 'fontFamily'],
    ['shadow/elevation/1', 'shadow'],
  ])('should infer "%s" as "%s"', (path, expected) => {
    expect(inferType(path, TYPE_PATTERNS)).toBe(expected);
  });
});
```

**UI Tests (Vitest + Happy DOM):**
```typescript
// ui/components/file-upload.test.ts
import { describe, it, expect } from 'vitest';
import { FileUploadManager } from './file-upload';

describe('FileUploadManager', () => {
  it('should parse valid JSON files', async () => {
    const file = new File(
      ['{"token": {"value": "#fff", "type": "color"}}'],
      'tokens.json',
      { type: 'application/json' }
    );

    const manager = new FileUploadManager();
    const result = await manager.handleFile(file);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('token');
  });
});
```

---

## 4. Migration Strategy (Phased Approach)

### Phase 1: Backend Foundation (Week 1)

**Goals:**
- Set up new directory structure
- Extract types to separate files
- Create utilities and constants
- No functional changes yet

**Tasks:**
1. Create `src/types/` directory and move all interfaces
2. Create `src/utils/constants.ts` with all magic strings/numbers
3. Create `src/utils/defaults.ts` with default value functions
4. Create `src/utils/errors.ts` with error classes
5. Update `code.ts` to import from new locations
6. Verify build still works

**Validation:**
- Plugin builds successfully
- All existing functionality works
- No regressions

### Phase 2: Backend Modules - Import (Week 1-2)

**Goals:**
- Extract import logic into modules
- Refactor type inference to be data-driven
- Add tests for import functionality

**Tasks:**
1. Create `src/import/` directory structure
2. Extract `createVariableCollection` → `import/collection.ts`
3. Extract `createVariable` → `import/variable.ts`
4. Refactor `inferTypeFromPath` → `type-inference/` (data-driven)
5. Extract alias logic → `import/alias-resolver.ts` (encapsulated state)
6. Create `import/index.ts` as orchestrator
7. Write tests for each module
8. Update `code.ts` to use new import modules

**Validation:**
- Import still works
- Tests pass
- No regressions

### Phase 3: Backend Modules - Export & Sync (Week 2)

**Goals:**
- Extract export and sync logic into modules
- Add tests for export/sync functionality

**Tasks:**
1. Create `src/export/` directory structure
2. Extract `exportBaselineSnapshot` → `export/baseline.ts`
3. Extract value serialization → `export/value-serializer.ts`
4. Create `src/sync/` directory structure
5. Extract `syncRegistryToNode` → `sync/node-manager.ts` + `sync/chunk-storage.ts`
6. Extract `getLastSyncInfo` → `sync/metadata.ts`
7. Write tests for export and sync modules
8. Update `code.ts` to use new modules

**Validation:**
- Export works
- Sync works
- Tests pass

### Phase 4: Backend Handlers (Week 2)

**Goals:**
- Extract message handling into separate handlers
- Slim down `code.ts` to just routing

**Tasks:**
1. Create `src/handlers/` directory
2. Create handler for each message type
3. Create message router in `handlers/index.ts`
4. Update `code.ts` to use router
5. Add tests for handlers

**Final `code.ts` (~50-80 lines):**
```typescript
import { handleMessage } from './handlers';

figma.showUI(__html__, {
  width: 600,
  height: 700,
  themeColors: true
});

figma.ui.onmessage = async (msg) => {
  await handleMessage(msg);
};
```

**Validation:**
- All messages still work
- Backend code is modular and testable

### Phase 5: Frontend Refactor - Structure (Week 3)

**Goals:**
- Split UI into modules (TypeScript)
- Extract CSS into separate files
- Set up UI bundling with esbuild

**Tasks:**
1. Create `src/styles/` directory and split CSS
2. Create `src/ui/` directory structure
3. Set up esbuild for UI bundling
4. Update manifest to point to bundled `ui.js`
5. Extract state management → `ui/state.ts`
6. Extract tab logic → `ui/tabs/`
7. Update `ui.html` to minimal structure + script tag

**Build Configuration:**
```javascript
// build.js
const esbuild = require('esbuild');

// Backend
esbuild.build({
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'code.js',
  target: 'es2017',
  platform: 'node',
});

// UI
esbuild.build({
  entryPoints: ['src/ui/index.ts'],
  bundle: true,
  outfile: 'ui.js',
  target: 'es2017',
  platform: 'browser',
});

// CSS
esbuild.build({
  entryPoints: ['src/styles/index.css'],
  bundle: true,
  outfile: 'ui.css',
});
```

**Validation:**
- UI builds successfully
- UI still works
- CSS loads correctly

### Phase 6: Frontend Refactor - Components (Week 3-4)

**Goals:**
- Extract components into separate files
- Add type safety to UI code
- Improve state management

**Tasks:**
1. Create `ui/components/` directory
2. Extract file upload → `components/file-upload.ts`
3. Extract collection config → `components/collection-config.ts`
4. Extract collection list → `components/collection-list.ts`
5. Extract success screen → `components/success-screen.ts`
6. Add TypeScript types for all components
7. Improve error handling in UI
8. Write UI tests

**Validation:**
- All UI functionality works
- Type safety catches bugs
- UI tests pass

### Phase 7: Documentation & Cleanup (Week 4)

**Goals:**
- Update documentation
- Remove dead code
- Final testing and validation

**Tasks:**
1. Update README with new architecture
2. Add JSDoc comments to public APIs
3. Create architecture diagram
4. Add developer guide
5. Comprehensive manual testing
6. Performance testing
7. Remove any unused code

---

## 5. Testing Strategy Details

### 5.1 Unit Tests

**Coverage Goals:**
- Type inference: 100% (critical, data-driven)
- Parsing functions: 100% (color, number, font)
- Utilities: 90%+
- Business logic: 80%+

**Mock Strategy for Figma API:**
```typescript
// __mocks__/figma.ts
export const mockFigma = {
  variables: {
    createVariable: vi.fn(),
    getLocalVariablesAsync: vi.fn(),
    getLocalVariableCollectionsAsync: vi.fn(),
  },
  createFrame: vi.fn(),
  notify: vi.fn(),
  ui: {
    postMessage: vi.fn(),
  },
};

// In tests
vi.mock('@figma/plugin-typings', () => ({
  figma: mockFigma,
}));
```

### 5.2 Integration Tests

**Test Scenarios:**
1. End-to-end import flow (upload → configure → import)
2. Export baseline with multiple collections
3. Sync to node and retrieve
4. Alias resolution across collections
5. Error handling for invalid data

**Example:**
```typescript
// __tests__/import-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { importTokens } from '../src/import';
import { mockFigma } from '../__mocks__/figma';

describe('Import Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import tokens with aliases correctly', async () => {
    const collections = [
      {
        name: 'Colors',
        isModeCollection: false,
        files: [
          {
            name: 'colors',
            content: {
              primary: { value: '#ff0000', type: 'color' },
              brand: { value: '{primary}', type: 'color' },
            }
          }
        ]
      }
    ];

    await importTokens(collections);

    // Verify variable creation
    expect(mockFigma.variables.createVariable).toHaveBeenCalledTimes(2);

    // Verify alias resolution
    // ... assertions
  });
});
```

### 5.3 Manual Testing Checklist

**Before Each Release:**
- [ ] Import with single mode collection
- [ ] Import with multi-mode collection
- [ ] Import with aliases
- [ ] Import with all supported token types
- [ ] Export baseline (all collections)
- [ ] Export baseline (selected collections)
- [ ] Sync to node
- [ ] Retrieve from Figma REST API
- [ ] Error handling (invalid JSON, wrong types, etc.)
- [ ] UI responsiveness and interactions
- [ ] Tab switching
- [ ] File drag and drop

---

## 6. Build Configuration Changes

### 6.1 New Build Scripts

**package.json updates:**
```json
{
  "scripts": {
    "build": "node build.js",
    "build:watch": "node build.js --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.90.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "happy-dom": "^12.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

### 6.2 Build Script

**build.js:**
```javascript
const esbuild = require('esbuild');
const fs = require('fs');

const watch = process.argv.includes('--watch');

// Backend build
esbuild.build({
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'code.js',
  target: 'es2017',
  platform: 'node',
  watch: watch ? {
    onRebuild(error, result) {
      if (error) console.error('Backend build failed:', error);
      else console.log('Backend rebuilt');
    },
  } : false,
}).then(() => {
  console.log('Backend build complete');
});

// UI build
esbuild.build({
  entryPoints: ['src/ui/index.ts'],
  bundle: true,
  outfile: 'ui.js',
  target: 'es2017',
  platform: 'browser',
  watch: watch ? {
    onRebuild(error, result) {
      if (error) console.error('UI build failed:', error);
      else console.log('UI rebuilt');
    },
  } : false,
}).then(() => {
  console.log('UI build complete');
});

// CSS build
esbuild.build({
  entryPoints: ['src/styles/index.css'],
  bundle: true,
  outfile: 'ui.css',
  loader: { '.css': 'css' },
  watch: watch ? {
    onRebuild(error, result) {
      if (error) console.error('CSS build failed:', error);
      else console.log('CSS rebuilt');
    },
  } : false,
}).then(() => {
  console.log('CSS build complete');
});

// Copy manifest
fs.copyFileSync('manifest.json', 'dist/manifest.json');
```

### 6.3 Manifest Updates

**manifest.json:**
```json
{
  "name": "Token Vault",
  "id": "token-vault",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "documentAccess": "dynamic-page",
  "editorType": ["figma", "dev"],
  "capabilities": ["inspect"],
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}
```

**ui.html (minimal):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="ui.css">
</head>
<body>
  <div id="app"></div>
  <script src="ui.js"></script>
</body>
</html>
```

---

## 7. Risk Assessment & Mitigation

### High Risk Areas

**1. Breaking Existing Functionality**
- **Risk:** Refactoring changes behavior
- **Mitigation:**
  - Comprehensive manual testing before each phase
  - Keep old code until new code is validated
  - Feature flags for gradual rollout

**2. Type Inference Changes**
- **Risk:** New data-driven approach infers differently
- **Mitigation:**
  - Create test cases from existing behavior
  - Regression tests with real-world token files
  - Document any intentional behavior changes

**3. Build System Changes**
- **Risk:** New bundling breaks plugin
- **Mitigation:**
  - Test in Figma desktop after each build change
  - Keep old build scripts until validated
  - Verify all assets load correctly

### Medium Risk Areas

**1. UI State Management**
- **Risk:** TypeScript refactor introduces state bugs
- **Mitigation:**
  - Gradual migration (one component at a time)
  - Extensive manual testing of UI flows
  - Keep UI tests up to date

**2. Alias Resolution Refactoring**
- **Risk:** Encapsulation breaks alias creation
- **Mitigation:**
  - Dedicated tests for alias scenarios
  - Manual testing with complex alias chains
  - Verify with real Clarity token files

---

## 8. Success Criteria

### Technical Metrics

- [ ] Backend code split into <15 modules, no file >200 lines
- [ ] Frontend code split into <20 modules, no file >150 lines
- [ ] Test coverage >80% for business logic
- [ ] Type inference 100% tested with data-driven approach
- [ ] All Figma API calls abstracted behind interfaces
- [ ] Zero global mutable state
- [ ] Build time <5 seconds for full build

### Functional Requirements

- [ ] All existing import functionality works
- [ ] All existing export functionality works
- [ ] All existing sync functionality works
- [ ] No regressions in UI behavior
- [ ] Error messages are clear and actionable
- [ ] Plugin loads in <2 seconds

### Developer Experience

- [ ] New developer can understand architecture in <1 hour
- [ ] Adding new token type takes <30 minutes
- [ ] Adding new message handler takes <15 minutes
- [ ] Tests run in <10 seconds
- [ ] Type errors caught at compile time
- [ ] Clear documentation for all public APIs

---

## 9. Future Enhancements (Post-Refactor)

These are out of scope for the initial refactor but become easier after:

1. **Plugin Configuration UI**
   - Let users customize type inference patterns
   - Save/load import configurations

2. **Advanced Alias Support**
   - Math expressions in aliases: `{spacing.base} * 2`
   - Conditional aliases based on mode

3. **Validation Rules**
   - Validate token structure before import
   - Show warnings for potential issues

4. **Export Formats**
   - Support multiple output formats (W3C DTCG, Style Dictionary, etc.)
   - Custom export templates

5. **Undo/Redo Support**
   - Track import changes
   - Allow rollback without re-importing

6. **Performance Optimizations**
   - Batch variable creation
   - Incremental updates (only changed tokens)

---

## 10. Conclusion

This refactoring addresses all major pain points:

✅ **Separation of Concerns**: Clear boundaries between import/export/sync
✅ **Testability**: All logic testable without Figma API
✅ **Maintainability**: Small, focused modules easy to understand
✅ **Type Safety**: TypeScript throughout (backend + UI)
✅ **Scalability**: Easy to add new features
✅ **Error Handling**: Consistent error strategy
✅ **Documentation**: Self-documenting with types and JSDoc

The phased approach ensures we can validate each step before proceeding, minimizing risk while maximizing improvement.
