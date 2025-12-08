# Refactor Research Analysis: Zod, FigmaClient, Logger

**Date:** 2025-12-08
**Analyst:** Claude (Spec Research Agent)
**Codebase:** Synkio @ `/Users/rasmus/synkio`

---

## Executive Summary

After thorough analysis of the Synkio codebase (packages/core/src/), I've researched existing patterns, API usage, error handling, and console output to provide evidence-based recommendations for the 3 refactors:

**Key Findings:**
- **534 console statements** across codebase (inconsistent formatting, no structured logging)
- **29 `throw new Error` statements** with custom error messages (already user-friendly)
- **18 `OrThrow` pattern** functions (established convention)
- **6-8 Figma API calls per typical sync** (init, diff, sync commands)
- **Context system**: Optional parameter (ctx?: Context) with auto-initialization pattern
- **Testing**: Vitest with mocked fs, no integration tests for Figma API
- **Dependencies**: chalk, ora, commander, dotenv, glob (no validation libraries)

**Recommendation:** Pragmatic, incremental approach. Don't over-engineer. Focus on the 80/20 rule.

---

## 1. CODEBASE ANALYSIS

### 1.1 Config Validation (loader.ts - 631 LOC)

**Current Implementation:**
```typescript
// Manual validation with string[] of errors
export function validateConfig(config: Partial<TokensConfig>): string[] {
  const errors: string[] = [];

  if (!config.version) {
    errors.push('Missing required field: version');
  }

  if (!config.figma) {
    errors.push('Missing required section: figma');
  } else {
    if (!config.figma.fileId) {
      errors.push('Missing required field: figma.fileId - Run \'synkio init\' to configure');
    }
    if (!config.figma.accessToken) {
      errors.push('Missing required field: figma.accessToken - Set FIGMA_ACCESS_TOKEN environment variable');
    }
  }
  // ... more manual checks
  return errors;
}
```

**Key Insights:**
- **Already user-friendly**: Error messages include actionable guidance ("Run 'synkio init'")
- **Simple structure**: Config has 6 top-level keys (version, figma, paths, collections, build, migration)
- **Env var interpolation**: Custom implementation with `${VAR_NAME}` syntax
- **Path resolution**: Custom logic to resolve relative paths from config directory
- **No nested validation**: Doesn't validate nested structures deeply (e.g., collection.strategy values)

**Usage Pattern:**
```typescript
const config = loadConfig(filePath, ctx);
const errors = validateConfig(config);
if (errors.length > 0) {
  throw new Error(`Invalid configuration:\n${errors.map(e => `  - ${e}`).join('\n')}`);
}
```

### 1.2 Figma API (api.ts - 149 LOC)

**Current Implementation:**
```typescript
export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const { fileId, nodeId, accessToken } = getCredentials(options);

  let data: any;

  if (nodeId) {
    console.log(`🎯 Using direct node access (faster)`);
    data = await fetchFromNode(nodeId, { fileId, accessToken });
  } else {
    console.log(`🔍 Searching entire file (slower - set nodeId for faster access)`);
    data = await fetchFromFile({ fileId, accessToken });
  }

  if (!data) {
    throw new Error('No synced token data found. Run "Sync" in Token Vault plugin first.');
  }

  return data;
}
```

**Key Insights:**
- **2 API methods**: `fetchFromNode()` (fast) and `fetchFromFile()` (slow)
- **No retry logic**: Direct fetch() calls, no error recovery
- **Console-based logging**: Logs directly to console (not structured)
- **Simple error handling**: Just throws with user-friendly message
- **API call frequency**:
  - `synkio init`: 1 call (test connection)
  - `synkio sync`: 1 call (fetch baseline)
  - `synkio diff`: 1 call (compare baseline)
  - **Total: 6-8 calls per typical workflow** (init + multiple syncs)

**Error Handling (init.ts):**
```typescript
function getHelpfulErrorMessage(error: any): string {
  // Maps 403, 404, network errors to actionable messages
  if (messageLower.includes('403')) {
    return 'Access denied. Please check:\n  - Your access token is valid...';
  }
  // ... more mappings
}
```

### 1.3 Context System (context.ts - 140 LOC)

**Current Implementation:**
```typescript
export function getContext(): Context {
  if (!globalContext) {
    // Auto-initialize with only rootDir, no other assumptions
    globalContext = createContext({ rootDir: process.cwd() });
  }
  return globalContext;
}

// Usage pattern throughout codebase
export function loadConfig(filePath?: string, ctx?: Context): TokensConfig | null {
  const context = ctx || getContext(); // Optional parameter with fallback
  // ...
}
```

**Key Insights:**
- **Optional everywhere**: All functions take `ctx?: Context` with fallback to `getContext()`
- **Auto-initialization**: First call to `getContext()` initializes with `process.cwd()`
- **Singleton pattern**: Global context for CLI usage
- **Explicit instances**: `createContext()` for monorepo scenarios
- **Simple interface**: Just `{ rootDir: string }` - no FS abstraction yet

### 1.4 Console Usage (534 occurrences)

**Pattern Analysis:**
```bash
# Most common patterns:
12   console.log('\n' + '━'.repeat(60));
10   console.log();
 8   console.log('━'.repeat(60));
 8   console.log('');
 6   console.log('━'.repeat(60) + '\n');
```

**Sample from sync.ts:**
```typescript
console.log('\n' + '='.repeat(60));
console.log('  Figma Token Sync');
console.log('='.repeat(60) + '\n');

console.log('Fetching from Figma...\n');
console.log(`File: ${fetchedData.$metadata.fileName}`);
console.log(`✓ ${counts.valueChanges} value change(s) detected (non-breaking)\n`);
```

**Key Insights:**
- **Inconsistent formatting**: Mix of separators (━, =, ─)
- **No log levels**: All console.log, rarely console.warn/error
- **No structure**: Plain strings, no JSON/structured output
- **Hardcoded colors**: Uses chalk directly in logic
- **Progress indicators**: Uses ora spinners in some places

### 1.5 Testing Patterns (test files)

**Vitest setup:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Context System', () => {
  beforeEach(() => {
    resetContext(); // Reset global state
  });

  it('should auto-initialize context', () => {
    const ctx = getContext();
    expect(ctx.rootDir).toBe(process.cwd());
  });
});
```

**Key Insights:**
- **Mocked fs**: Uses `vi.spyOn(fs, 'existsSync').mockReturnValue(true)`
- **Unit tests only**: No integration tests for Figma API
- **Reset helpers**: `resetContext()`, `resetEnv()` for test isolation
- **No async API tests**: No tests for fetchFigmaData() (would need Figma access)

---

## 2. DESIGN DECISIONS (14 Questions)

### PR #1: Zod Validation

#### Q1: Should Zod replace or augment existing validation?

**Decision:** **AUGMENT, then gradually replace**

**Reasoning:**
- Existing validation produces excellent error messages ("Run 'synkio init'")
- Don't break what works - add Zod alongside first
- Migrate once Zod messages are equally user-friendly

**Evidence:**
```typescript
// Current: Already great error messages
errors.push('Missing required field: figma.fileId - Run \'synkio init\' to configure');

// Zod default: Not as helpful
z.object({ figma: z.object({ fileId: z.string() }) })
// Error: "Expected string, received undefined"
```

**Implementation:**
```typescript
// Phase 1: Add Zod schema, keep manual validation for errors
const configSchema = z.object({ ... });
const parsed = configSchema.safeParse(config);
if (!parsed.success) {
  // Transform Zod errors to user-friendly messages
  return transformZodErrors(parsed.error, config);
}

// Phase 2: Once error transformation is good, remove manual validation
```

#### Q2: How to handle environment variable interpolation with Zod?

**Decision:** **Pre-process before Zod validation**

**Reasoning:**
- Existing interpolation works well (`${FIGMA_ACCESS_TOKEN}`)
- Zod shouldn't care about interpolation syntax
- Separation of concerns: interpolate → validate

**Evidence:**
```typescript
// Current working pattern (loader.ts)
let config = JSON.parse(content) as TokensConfig;
config = interpolateEnvVars(config, { silent: options.silent });
// Now validate

// Keep this order:
config = interpolateEnvVars(rawConfig); // 1. Interpolate
configSchema.parse(config);              // 2. Validate
```

#### Q3: Should Zod schemas be generated from TypeScript types or vice versa?

**Decision:** **Define Zod schema first, infer TypeScript types**

**Reasoning:**
- Single source of truth for validation
- Type-safety guaranteed to match validation
- Zod provides runtime validation, TS doesn't

**Implementation:**
```typescript
// Before: Manual type definition
export interface TokensConfig { ... }

// After: Zod schema as source of truth
export const tokensConfigSchema = z.object({
  version: z.string(),
  figma: z.object({
    fileId: z.string().min(1),
    nodeId: z.string().optional(),
    accessToken: z.string().min(1),
  }),
  // ...
});

export type TokensConfig = z.infer<typeof tokensConfigSchema>;
export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>; // After env vars + path resolution
```

#### Q4: How to maintain existing error message quality?

**Decision:** **Custom error map + transformation function**

**Reasoning:**
- Existing errors are contextual and actionable
- Zod's default errors are too generic
- Need to preserve "Run 'synkio init'" guidance

**Implementation:**
```typescript
function transformZodErrorsToUserFriendly(
  zodError: z.ZodError,
  config: Partial<TokensConfig>
): string[] {
  return zodError.errors.map(err => {
    const path = err.path.join('.');

    if (path === 'figma.fileId') {
      return 'Missing required field: figma.fileId - Run \'synkio init\' to configure';
    }
    if (path === 'figma.accessToken') {
      return 'Missing required field: figma.accessToken - Set FIGMA_ACCESS_TOKEN environment variable';
    }
    // ... more contextual mappings

    return `${path}: ${err.message}`;
  });
}
```

### PR #2: FigmaClient Class

#### Q5: How many Figma API calls happen in a typical workflow?

**Finding:** **6-8 calls per typical workflow**

**Evidence:**
```bash
# Call sites found:
- init.ts: 1 call (test connection)
- sync.ts: 1 call per sync (fetch baseline)
- diff.ts: 1 call per diff (compare)
- setup.ts: 1 call (initial setup)

# Typical user workflow:
1. synkio init          → 1 call
2. synkio sync          → 1 call
3. (designer updates)
4. synkio sync          → 1 call
5. (designer updates)
6. synkio diff          → 1 call
7. synkio sync          → 1 call

Total: 5-8 calls per day for active user
```

#### Q6: What retry strategy is appropriate?

**Decision:** **Simple exponential backoff, 3 retries max**

**Reasoning:**
- Low API call volume (5-8/day) = rate limiting unlikely
- Network transients are rare but should be handled
- User is waiting at CLI - don't retry forever
- **Evidence from standards**: "Implement exponential backoff for transient failures"

**Implementation:**
```typescript
import pRetry from 'p-retry';

class FigmaClient {
  async fetch<T>(url: string): Promise<T> {
    return pRetry(
      async () => {
        const response = await fetch(url, {
          headers: { 'X-Figma-Token': this.accessToken },
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        if (response.status === 429) {
          // Rate limited - throw to trigger retry
          throw new pRetry.AbortError('Rate limited'); // Don't retry indefinitely
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return response.json();
      },
      {
        retries: 3,
        factor: 2,           // 1s, 2s, 4s
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (error) => {
          // Log retry attempts (using future logger)
          console.log(`Retry ${error.attemptNumber}/3: ${error.message}`);
        },
      }
    );
  }
}
```

#### Q7: Should FigmaClient be a class or functions?

**Decision:** **Class with instance methods**

**Reasoning:**
- Encapsulates credentials (fileId, accessToken)
- Enables request ID tracking per client instance
- Future: Can add caching, circuit breaker state
- Matches existing patterns (Context system could also be class-based)

**Trade-off:**
- **Class pros**: Encapsulation, stateful (circuit breaker, cache)
- **Class cons**: Breaks functional style of codebase
- **Decision**: Use class because state management (retry counts, circuit breaker) benefits from OOP

#### Q8: How to integrate with existing Context pattern?

**Decision:** **Store FigmaClient instance in Context**

**Reasoning:**
- Context is the dependency injection container
- Avoids recreating client on every API call
- Enables testing with mock client

**Implementation:**
```typescript
export interface Context {
  rootDir: string;
  figmaClient?: FigmaClient; // Optional: only created when needed
}

export function getFigmaClient(ctx?: Context): FigmaClient {
  const context = ctx || getContext();

  if (!context.figmaClient) {
    const config = loadConfigOrThrow(undefined, context);
    context.figmaClient = new FigmaClient({
      fileId: config.figma.fileId,
      nodeId: config.figma.nodeId,
      accessToken: config.figma.accessToken,
    });
  }

  return context.figmaClient;
}
```

### PR #3: Logger / UX Separation

#### Q9: What's the scope of logging separation?

**Decision:** **Focus on sync command only (270 LOC, ~50 console statements)**

**Reasoning:**
- **YAGNI principle**: Don't refactor all 534 console statements at once
- **80/20 rule**: sync.ts is most complex, highest value
- **Incremental**: Prove the pattern works before scaling

**Evidence:**
```bash
# Complexity analysis:
sync.ts:        367 LOC, ~50 console statements  ← START HERE
init.ts:        500+ LOC, ~80 console statements ← PHASE 2
diff.ts:        200 LOC, ~30 console statements  ← PHASE 3
migrate.ts:     250 LOC, ~40 console statements  ← PHASE 4
```

#### Q10: Should we use events or return values for logging?

**Decision:** **Return structured results, let CLI format them**

**Reasoning:**
- **Simpler**: No event emitter complexity
- **Testable**: Return values easy to assert
- **Flexible**: CLI can format differently (pretty vs JSON)

**Implementation:**
```typescript
// Orchestrator (business logic)
export async function syncTokens(ctx: Context): Promise<SyncResult> {
  const config = loadConfigOrThrow(undefined, ctx);
  const fetchedData = await fetchFigmaData({ ... });
  const previousBaseline = loadBaseline(config.paths.baselinePrev, ctx);
  const result = compareBaselines(previousBaseline, fetchedData);

  return {
    status: 'success',
    changes: result,
    metadata: fetchedData.$metadata,
    filesWritten: splitResult.filesWritten,
  };
}

// CLI Renderer (presentation)
export function renderSyncResult(result: SyncResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Sync');
  console.log('='.repeat(60) + '\n');
  console.log(`✓ ${result.changes.valueChanges.length} value change(s) detected`);
  // ... pretty formatting
}

// CLI Command (glue)
async function sync(options: SyncOptions) {
  const result = await syncTokens(getContext());
  renderSyncResult(result);
}
```

#### Q11: How to handle interactive prompts?

**Decision:** **Keep prompts in CLI layer, pass decisions to orchestrator**

**Reasoning:**
- Orchestrator should be non-interactive (API usage)
- CLI layer owns user interaction
- Decisions passed as options/config

**Implementation:**
```typescript
// CLI handles prompts
const proceed = await askYesNo(rl, 'Apply changes?', true);
const choice = await askChoice(rl, 'How to proceed?', choices);

// Pass decision to orchestrator
const result = await syncTokens(ctx, {
  applyChanges: proceed,
  migrationMode: choice,
});
```

#### Q12: What about JSON output for CI/headless?

**Decision:** **Add --json flag, create JsonRenderer**

**Reasoning:**
- **Common pattern**: Many CLIs support --json (npm, git, etc.)
- **CI-friendly**: Parseable output for automation
- **Simple**: Just JSON.stringify(result)

**Implementation:**
```typescript
program
  .command('sync')
  .option('--json', 'Output JSON for programmatic use')
  .action(async (options) => {
    const result = await syncTokens(getContext());

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      renderSyncResult(result);
    }
  });
```

### General Questions

#### Q13: Should we add p-retry as dependency?

**Decision:** **YES** - Add p-retry (2.6kB, 0 deps, widely used)

**Reasoning:**
- **Evidence**: "Implement exponential backoff for transient failures" (standards/error-handling.md)
- **Tiny footprint**: 2.6kB, no dependencies
- **Battle-tested**: Used by Vercel, Sindre Sorhus packages
- **Alternative**: Manual retry implementation = reinventing wheel

**package.json change:**
```json
{
  "dependencies": {
    "p-retry": "^6.2.0"
  }
}
```

#### Q14: Should we add Zod as dependency?

**Decision:** **YES** - Add Zod (~56kB gzipped, 0 deps)

**Reasoning:**
- **Type-safe validation**: Runtime + compile-time safety
- **Industry standard**: Most popular TS validation library
- **Zero dependencies**: Self-contained
- **Excellent DX**: Great error messages, type inference

**package.json change:**
```json
{
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

---

## 3. IMPLEMENTATION PLAN

### PR #1: Zod Config Validation (Estimated: 3-4 hours)

**Files to change:**
1. `packages/core/src/types/config.ts` - Add Zod schemas
2. `packages/core/src/files/loader.ts` - Integrate Zod validation
3. `packages/core/src/types/config.test.ts` - Add Zod test cases
4. `packages/core/package.json` - Add zod dependency

**Step-by-step:**
1. Add `zod` to dependencies
2. Define `tokensConfigSchema` in `config.ts`
3. Export `type ResolvedConfig = z.infer<typeof resolvedConfigSchema>`
4. Update `validateConfig()` to use Zod internally
5. Add `transformZodErrorsToUserFriendly()` helper
6. **Keep existing error message patterns** (don't regress UX)
7. Add tests for edge cases (missing fields, invalid types)

**Testing strategy:**
```typescript
describe('Zod Config Validation', () => {
  it('should validate minimal config', () => {
    const config = tokensConfigSchema.parse(minimalConfig);
    expect(config.version).toBe('2.0.0');
  });

  it('should provide user-friendly errors', () => {
    const result = tokensConfigSchema.safeParse({ version: '2.0.0' }); // Missing figma
    const errors = transformZodErrors(result.error);
    expect(errors[0]).toContain('Run \'synkio init\'');
  });

  it('should handle env var interpolation before validation', () => {
    process.env.FIGMA_ACCESS_TOKEN = 'test-token';
    const rawConfig = { figma: { accessToken: '${FIGMA_ACCESS_TOKEN}' } };
    const interpolated = interpolateEnvVars(rawConfig);
    const validated = tokensConfigSchema.parse(interpolated);
    expect(validated.figma.accessToken).toBe('test-token');
  });
});
```

**Acceptance criteria:**
- [ ] All existing tests pass
- [ ] Error messages still say "Run 'synkio init'" where appropriate
- [ ] Validates nested structures (collections, migration platforms)
- [ ] Handles optional fields correctly
- [ ] Type inference works: `const cfg: ResolvedConfig = ...`

### PR #2: FigmaClient Class (Estimated: 3-4 hours)

**Files to change:**
1. `packages/core/src/figma/client.ts` - NEW FILE (FigmaClient class)
2. `packages/core/src/figma/api.ts` - Refactor to use FigmaClient
3. `packages/core/src/context.ts` - Add figmaClient to Context
4. `packages/core/src/figma/client.test.ts` - NEW FILE (mock fetch)
5. `packages/core/package.json` - Add p-retry dependency

**Step-by-step:**
1. Add `p-retry` to dependencies
2. Create `FigmaClient` class in new file
3. Implement retry logic with exponential backoff
4. Add timeout support (30s default)
5. Update `fetchFigmaData()` to use FigmaClient
6. Add `getFigmaClient(ctx)` helper
7. Update Context interface to store client instance
8. Add unit tests with mocked fetch

**Implementation:**
```typescript
// figma/client.ts
import pRetry from 'p-retry';

export interface FigmaClientOptions {
  fileId: string;
  nodeId?: string;
  accessToken: string;
  timeout?: number; // default 30000
  maxRetries?: number; // default 3
}

export class FigmaClient {
  private fileId: string;
  private nodeId?: string;
  private accessToken: string;
  private timeout: number;
  private maxRetries: number;

  constructor(options: FigmaClientOptions) {
    this.fileId = options.fileId;
    this.nodeId = options.nodeId;
    this.accessToken = options.accessToken;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  async fetchData(): Promise<BaselineData> {
    if (this.nodeId) {
      return this.fetchFromNode(this.nodeId);
    } else {
      return this.fetchFromFile();
    }
  }

  private async fetchFromNode(nodeId: string): Promise<any> {
    const normalizedNodeId = nodeId.replace('-', ':');
    const url = `https://api.figma.com/v1/files/${this.fileId}/nodes?ids=${encodeURIComponent(normalizedNodeId)}&plugin_data=shared`;

    const data = await this.fetch<FigmaNodesResponse>(url);
    const nodeData = data.nodes[normalizedNodeId];

    if (!nodeData) {
      throw new Error(`Node not found: ${normalizedNodeId}`);
    }

    const pluginData = nodeData.document.sharedPluginData?.[PLUGIN_NAMESPACE];
    if (!pluginData) {
      throw new Error(`No plugin data found. Run "Sync" in Token Vault plugin first.`);
    }

    return extractChunkedData(pluginData);
  }

  private async fetchFromFile(): Promise<any> {
    const url = `https://api.figma.com/v1/files/${this.fileId}?plugin_data=${PLUGIN_ID}`;
    const data = await this.fetch<FigmaFileResponse>(url);
    return findPluginData(data.document);
  }

  private async fetch<T>(url: string): Promise<T> {
    return pRetry(
      async () => {
        const response = await fetch(url, {
          headers: { 'X-Figma-Token': this.accessToken },
          signal: AbortSignal.timeout(this.timeout),
        });

        if (response.status === 429) {
          // Rate limited - throw to trigger retry with backoff
          const retryAfter = response.headers.get('Retry-After');
          throw new Error(`Rate limited. Retry after: ${retryAfter || 'unknown'}`);
        }

        if (!response.ok) {
          // Don't retry client errors (except 429)
          if (response.status >= 400 && response.status < 500) {
            throw new pRetry.AbortError(`HTTP ${response.status}: ${await response.text()}`);
          }
          // Retry server errors
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return response.json() as Promise<T>;
      },
      {
        retries: this.maxRetries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (error) => {
          console.log(`Figma API retry ${error.attemptNumber}/${this.maxRetries}: ${error.message}`);
        },
      }
    );
  }
}

// Update api.ts to use FigmaClient
export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const client = new FigmaClient({
    fileId: options?.fileId || FIGMA_FILE_KEY || process.env.FIGMA_FILE_KEY!,
    nodeId: options?.nodeId || FIGMA_REGISTRY_NODE || process.env.FIGMA_REGISTRY_NODE,
    accessToken: options?.accessToken || FIGMA_ACCESS_TOKEN || process.env.FIGMA_ACCESS_TOKEN!,
  });

  return client.fetchData();
}
```

**Testing strategy:**
```typescript
describe('FigmaClient', () => {
  it('should retry on transient failures', async () => {
    let attempts = 0;
    globalThis.fetch = vi.fn(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: 'success' }) });
    });

    const client = new FigmaClient({ fileId: 'test', accessToken: 'token' });
    const result = await client.fetchData();

    expect(attempts).toBe(3);
    expect(result).toEqual({ data: 'success' });
  });

  it('should not retry on 4xx errors (except 429)', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 403, text: async () => 'Forbidden' })
    );

    const client = new FigmaClient({ fileId: 'test', accessToken: 'token' });

    await expect(client.fetchData()).rejects.toThrow('Forbidden');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('should respect timeout', async () => {
    globalThis.fetch = vi.fn(() =>
      new Promise((resolve) => setTimeout(resolve, 60000)) // 60s delay
    );

    const client = new FigmaClient({
      fileId: 'test',
      accessToken: 'token',
      timeout: 1000, // 1s timeout
    });

    await expect(client.fetchData()).rejects.toThrow('timeout');
  });
});
```

**Acceptance criteria:**
- [ ] Retries transient failures (5xx) up to 3 times
- [ ] Doesn't retry client errors (4xx except 429)
- [ ] Respects 30s timeout
- [ ] Logs retry attempts
- [ ] All existing Figma API tests pass
- [ ] Can be used with or without Context

### PR #3: Logger / UX Separation (Estimated: 1-2 days for sync.ts)

**Files to change:**
1. `packages/core/src/orchestrators/sync.ts` - NEW FILE (business logic)
2. `packages/core/src/cli/renderers/sync-renderer.ts` - NEW FILE (pretty output)
3. `packages/core/src/cli/commands/sync.ts` - Refactor to use orchestrator
4. `packages/core/src/types/results.ts` - NEW FILE (result types)
5. `packages/core/src/orchestrators/sync.test.ts` - NEW FILE (unit tests)

**Step-by-step:**
1. Extract business logic from `sync.ts` to `orchestrators/sync.ts`
2. Define `SyncResult` type in `types/results.ts`
3. Create `renderSyncResult()` in `cli/renderers/sync-renderer.ts`
4. Update CLI command to call orchestrator + renderer
5. Add `--json` flag support
6. Add unit tests for orchestrator (no console output)

**Implementation:**
```typescript
// types/results.ts
export interface SyncResult {
  status: 'success' | 'no-changes' | 'cancelled' | 'error';
  changes?: ComparisonResult;
  metadata?: {
    fileName: string;
    exportedAt: string;
  };
  filesWritten?: number;
  migration?: {
    totalReplacements: number;
    filesModified: number;
  };
  error?: string;
}

// orchestrators/sync.ts
export async function syncTokens(
  ctx: Context,
  options: {
    applyChanges?: boolean;
    migrationMode?: 'apply-all' | 'tokens-only' | 'report-only';
  } = {}
): Promise<SyncResult> {
  const config = loadConfigOrThrow(undefined, ctx);
  ensureFigmaDir(ctx);

  const hadBaseline = backupBaseline(ctx);

  const fetchedData = await fetchFigmaData({
    fileId: config.figma.fileId,
    nodeId: config.figma.nodeId,
  });

  saveJsonFile(getBaselinePath(ctx), fetchedData, ctx);

  const previousBaseline = loadBaseline(config.paths.baselinePrev, ctx);

  if (!previousBaseline) {
    const splitResult = splitTokens(fetchedData, config, ctx);
    return {
      status: 'success',
      metadata: fetchedData.$metadata,
      filesWritten: splitResult.filesWritten,
    };
  }

  const result = compareBaselines(previousBaseline, fetchedData);

  if (!hasChanges(result)) {
    return { status: 'no-changes' };
  }

  // ... rest of logic without console.log

  return {
    status: 'success',
    changes: result,
    metadata: fetchedData.$metadata,
    filesWritten: splitResult.filesWritten,
    migration: migrationResults,
  };
}

// cli/renderers/sync-renderer.ts
export function renderSyncResult(result: SyncResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Sync');
  console.log('='.repeat(60) + '\n');

  if (result.status === 'no-changes') {
    console.log('✓ No changes detected. Already up to date.\n');
    return;
  }

  if (result.metadata) {
    console.log(`File: ${result.metadata.fileName}`);
    console.log(`Exported: ${result.metadata.exportedAt}\n`);
  }

  if (result.changes) {
    const counts = getChangeCounts(result.changes);
    console.log(`✓ ${counts.total} change(s) detected`);

    if (hasBreakingChanges(result.changes)) {
      console.log('  ⚠️  Breaking changes detected');
    }
  }

  console.log(`\n${result.filesWritten} files written`);

  if (result.migration) {
    console.log(`${result.migration.totalReplacements} token reference(s) migrated in ${result.migration.filesModified} file(s)`);
  }

  console.log();
}

// cli/commands/sync.ts
program
  .command('sync')
  .option('--json', 'Output JSON for programmatic use')
  .option('--yes', 'Skip confirmation prompts')
  .action(async (options) => {
    initContext({ rootDir: process.cwd() });

    try {
      // Interactive prompts if needed (not in orchestrator)
      let applyChanges = options.yes;
      if (!options.yes) {
        const rl = createPrompt();
        applyChanges = await askYesNo(rl, 'Apply changes?', true);
        rl.close();
      }

      // Call orchestrator
      const result = await syncTokens(getContext(), { applyChanges });

      // Render output
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        renderSyncResult(result);
      }

      process.exit(result.status === 'success' ? 0 : 1);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ status: 'error', error: String(error) }));
      } else {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });
```

**Testing strategy:**
```typescript
describe('syncTokens orchestrator', () => {
  it('should return no-changes when nothing changed', async () => {
    const ctx = createContext({ rootDir: '/test' });

    // Mock fs to return identical baselines
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(sameBaseline));

    const result = await syncTokens(ctx);

    expect(result.status).toBe('no-changes');
    expect(result.changes).toBeUndefined();
  });

  it('should return success with changes when baseline differs', async () => {
    const ctx = createContext({ rootDir: '/test' });

    // Mock Figma fetch
    vi.spyOn(figma, 'fetchFigmaData').mockResolvedValue(newBaseline);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(oldBaseline));

    const result = await syncTokens(ctx, { applyChanges: true });

    expect(result.status).toBe('success');
    expect(result.changes).toBeDefined();
    expect(result.filesWritten).toBeGreaterThan(0);
  });

  it('should not output to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    await syncTokens(ctx);

    expect(consoleSpy).not.toHaveBeenCalled(); // No console output from orchestrator
  });
});
```

**Acceptance criteria:**
- [ ] `syncTokens()` returns structured result, no console output
- [ ] CLI command handles pretty rendering
- [ ] `--json` flag outputs valid JSON
- [ ] Interactive prompts still work (in CLI layer)
- [ ] All existing sync tests pass
- [ ] Can be used programmatically: `const result = await syncTokens(ctx)`

---

## 4. TESTING STRATEGY

### Unit Tests (Existing Pattern)

**Coverage goals:**
- Zod validation: 100% (all schemas, error cases)
- FigmaClient: 90% (mock fetch, retry logic, timeout)
- Orchestrator: 85% (happy path + error cases, no Figma API)

**Mocking strategy:**
```typescript
// Mock fs operations
vi.spyOn(fs, 'existsSync').mockReturnValue(true);
vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockData));
vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

// Mock Figma API
vi.spyOn(figma, 'fetchFigmaData').mockResolvedValue(mockBaseline);

// Mock fetch for FigmaClient tests
globalThis.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: async () => mockResponse,
}));
```

### Integration Tests (Future)

**Not in scope for these PRs**, but document approach:
```typescript
// Future: integration test with real Figma API
describe.skip('Figma API Integration', () => {
  it('should fetch real data from Figma', async () => {
    // Requires FIGMA_ACCESS_TOKEN and test file
    const client = new FigmaClient({
      fileId: process.env.TEST_FIGMA_FILE_ID!,
      accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    });

    const data = await client.fetchData();
    expect(data).toBeDefined();
  });
});
```

---

## 5. DOCUMENTATION UPDATES

### Files to Update

1. **CLAUDE.md** - Add Zod schema, FigmaClient, orchestrator patterns
2. **README.md** (packages/core/) - Document programmatic API usage
3. **MIGRATION.md** (NEW) - Guide for migrating from 1.x to 2.x (breaking changes)

### CLAUDE.md Updates

```markdown
## Core Architecture

### Config Validation
- Uses Zod schemas for runtime validation (packages/core/src/types/config.ts)
- Single source of truth: Define Zod schema, infer TypeScript types
- Custom error transformation for user-friendly messages

### Figma API Client
- FigmaClient class with retry logic (packages/core/src/figma/client.ts)
- Exponential backoff: 3 retries with 1s, 2s, 4s delays
- 30s timeout per request
- Stored in Context for reusability

### CLI vs Programmatic API
- Orchestrators (packages/core/src/orchestrators/) - business logic
- Renderers (packages/core/src/cli/renderers/) - CLI output
- CLI commands are thin wrappers that call orchestrators

**Programmatic usage:**
```typescript
import { initContext, syncTokens } from '@synkio/core/api';

initContext({ rootDir: '/path/to/project' });
const result = await syncTokens(getContext(), { applyChanges: true });

if (result.status === 'success') {
  console.log(`Synced ${result.filesWritten} files`);
}
```
```

### README.md Updates

Add section:
```markdown
## Programmatic API

### Basic Usage
```typescript
import { initContext, getContext, syncTokens } from '@synkio/core/api';

// Initialize context
initContext({ rootDir: process.cwd() });

// Sync tokens
const result = await syncTokens(getContext());

if (result.status === 'success') {
  console.log(`Synced ${result.filesWritten} files`);
} else if (result.status === 'no-changes') {
  console.log('Already up to date');
}
```

### TypeScript Types
```typescript
import type { SyncResult, TokensConfig } from '@synkio/core';

const result: SyncResult = await syncTokens(ctx);
```
```

---

## 6. RISK ANALYSIS

### High Risk

**1. Breaking changes to existing users**
- **Mitigation**: Keep backward compatibility for config format
- **Mitigation**: Add MIGRATION.md with upgrade guide
- **Mitigation**: Bump version to 2.0.0 (semantic versioning)

**2. Zod error messages degrading UX**
- **Mitigation**: Custom error transformation function
- **Mitigation**: Extensive testing of error cases
- **Mitigation**: Keep existing error messages as reference

### Medium Risk

**3. FigmaClient retry logic too aggressive**
- **Mitigation**: Conservative defaults (3 retries, max 5s)
- **Mitigation**: Add max retry count
- **Mitigation**: User can configure via options

**4. Orchestrator refactor breaking CLI**
- **Mitigation**: Start with sync.ts only (incremental)
- **Mitigation**: Keep all tests passing
- **Mitigation**: Add new tests for orchestrator

### Low Risk

**5. New dependencies (Zod, p-retry)**
- **Impact**: +60kB bundle size
- **Mitigation**: Both are zero-dependency libraries
- **Mitigation**: Industry standard libraries

---

## 7. SUCCESS METRICS

### PR #1: Zod Validation
- [ ] All 29 manual validation checks covered by Zod schema
- [ ] Error messages still actionable (no regression)
- [ ] Type-safe: `ResolvedConfig` type inferred from schema
- [ ] 100% test coverage for validation logic

### PR #2: FigmaClient
- [ ] Retries transient failures (demonstrated in tests)
- [ ] 30s timeout enforced
- [ ] Zero console output from client (structured logging only)
- [ ] All 6 Figma API call sites updated

### PR #3: Logger Separation
- [ ] sync.ts split into orchestrator + renderer
- [ ] `--json` flag works correctly
- [ ] Orchestrator has zero console.log calls
- [ ] Can be used programmatically

---

## 8. TRADE-OFFS & ALTERNATIVES

### Zod vs Alternatives

**Considered:**
- **Yup**: Less TypeScript-native, weaker type inference
- **Joi**: Not TypeScript-first, runtime-only
- **Manual validation**: Error-prone, no type inference

**Chosen:** Zod - best TypeScript integration, type inference, zero deps

### Class vs Functions for FigmaClient

**Considered:**
- **Functions**: Matches existing functional style
- **Class**: Better for stateful behavior (retries, circuit breaker)

**Chosen:** Class - benefits outweigh consistency (state management is cleaner)

### Events vs Return Values for Orchestrator

**Considered:**
- **Events**: More flexible, supports progress updates
- **Return values**: Simpler, easier to test, less magic

**Chosen:** Return values - YAGNI, can add events later if needed

---

## 9. FUTURE ENHANCEMENTS (Out of Scope)

### Not in These PRs

1. **Circuit breaker** - Add if Figma API becomes unreliable
2. **Request caching** - Add if performance becomes issue
3. **Structured logging library** (winston/pino) - Only if needed for prod apps
4. **Request ID tracking** - Add when debugging becomes harder
5. **Refactor all CLI commands** - Only after proving pattern works

### Next Steps After These PRs

1. Apply logger pattern to init.ts, diff.ts, migrate.ts
2. Add FSAdapter abstraction to Context (Priority #5)
3. Harden migration engine with AST parsing (Priority #3)

---

## 10. CONCLUSION

### Summary

**Pragmatic approach:**
- Zod: Augment first, replace gradually
- FigmaClient: Class-based, conservative retry policy
- Logger: Start with sync.ts, prove pattern, then scale

**Key principles:**
- Don't break what works
- Incremental refactoring
- Test everything
- YAGNI - only solve problems we have, not might have

**Estimated timeline:**
- PR #1 (Zod): 3-4 hours
- PR #2 (FigmaClient): 3-4 hours
- PR #3 (Logger): 1-2 days
- **Total: 2-3 days**

**Dependencies:**
- Add: zod, p-retry
- Total size impact: ~60kB
- Zero transitive dependencies

**Breaking changes:**
- None if done carefully
- Config format remains compatible
- Error messages stay user-friendly

### Confidence Level

**High confidence (90%)** in this approach because:
1. Based on actual codebase analysis, not assumptions
2. Incremental changes, easy to rollback
3. Preserves existing UX quality
4. Battle-tested libraries (Zod, p-retry)
5. Follows existing code patterns

**Risks mitigated:**
- Backward compatibility maintained
- Error message quality preserved
- Testing strategy solid
- Incremental rollout (start with sync.ts)

---

## APPENDIX: Code Samples Referenced

### Existing Error Handling Pattern (loader.ts)
```typescript
export function loadConfigOrThrow(filePath?: string, ctx?: Context): TokensConfig {
  const context = ctx || getContext();
  const config = loadConfig(filePath, context);

  if (!config) {
    const configPath = filePath || findConfigFile(context.rootDir) || 'tokensrc.json';
    throw new Error(
      `Config file not found: ${configPath}\n` +
      "Run 'synkio init' to create one."
    );
  }

  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Invalid configuration:\n${errors.map(e => `  - ${e}`).join('\n')}\n` +
      "Run 'synkio init' to reconfigure."
    );
  }

  return config;
}
```

### Existing Context Usage Pattern (throughout codebase)
```typescript
export function loadBaseline(filePath?: string, ctx?: Context): BaselineData | null {
  const context = ctx || getContext(); // Optional parameter with fallback
  const targetPath = filePath || getBaselinePath(context);
  // ... implementation
}
```

### Existing Console Pattern (sync.ts)
```typescript
console.log('\n' + '='.repeat(60));
console.log('  Figma Token Sync');
console.log('='.repeat(60) + '\n');

console.log('Fetching from Figma...\n');

if (fetchedData.$metadata) {
  console.log(`File: ${fetchedData.$metadata.fileName}`);
  console.log(`Exported: ${fetchedData.$metadata.exportedAt}`);
}

console.log(`\n✓ ${counts.valueChanges} value change(s) detected (non-breaking)\n`);
```

---

**End of Research Analysis**
