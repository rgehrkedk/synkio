# Specification: Synkio 3-Focused Refactor

## Goal

Reduce codebase by 150 LOC net while improving production stability, type safety, and maintainability through 3 focused refactors. Target completion: 1-2 work days.

## User Stories

- As a developer, I want config validation to catch errors early with clear messages so I can fix issues without debugging
- As a Synkio user, I want reliable Figma API calls that automatically retry transient failures so my token syncs don't fail unexpectedly
- As a contributor, I want structured, testable logging so I can write clean tests and add monitoring capabilities

## Specific Requirements

**Zod Config Schema Validation**
- Replace ~200 LOC of manual validation with Zod schema (net -100 LOC)
- Define schema as single source of truth, infer TypeScript types from it
- Pre-process environment variable interpolation before validation
- Transform Zod errors into actionable messages matching existing quality ("Run 'synkio init'")
- Use `.strict()` to catch typos in config files
- Validate nested structures (collections, split strategy, migration platforms)
- Maintain backward compatibility with existing tokensrc.json format
- Export `ResolvedConfig` type guaranteed valid after parsing

**Figma Client with Retry Logic**
- Create FigmaClient class encapsulating API calls (adds +100 LOC)
- Implement exponential backoff retry: 3 retries max, 1s/2s/4s delays
- Handle 429 rate limiting with proper backoff
- Enforce 30-second timeout per request
- Retry server errors (5xx), abort client errors (4xx except 429)
- Extract and log request IDs for debugging
- Store client instance in Context for reusability
- Replace all 6-8 Figma API call sites throughout codebase

**Structured Logger System**
- Create Logger interface with debug/info/warn/error methods
- Implement ConsoleLogger (production) and SilentLogger (tests)
- Add logger to Context with smart default (auto-creates ConsoleLogger)
- Migrate sync.ts console statements first (~50 instances)
- Support DEBUG environment variable for verbose logging
- Accept structured metadata (not just strings)
- Enable testing without console pollution
- Foundation for future monitoring integration (Sentry, DataDog)

**Type Safety Improvements**
- Remove defensive null checks after Zod validation (config.figma?.fileId → config.figma.fileId)
- Eliminate optional chaining where types guarantee presence
- TypeScript enforces required fields through inferred types
- Reduce runtime validation code, increase compile-time safety

**Error Handling Standards**
- Maintain existing "OrThrow" pattern consistency
- Preserve actionable error messages with guidance
- Continue using user-friendly error text from current implementation
- Zod error transformation must match or exceed current message quality

**Testing Requirements**
- All new code must have unit tests with Vitest
- Use mocked fs and fetch for unit tests
- SilentLogger for test contexts to suppress output
- Minimum 85% coverage for new code
- Integration tests out of scope (no real Figma API calls)

**Dependency Management**
- Add zod (^3.22.0) - 56kB gzipped, 0 dependencies
- Add p-retry (^6.2.0) - 2.6kB, 0 dependencies
- Total bundle impact: ~60kB
- Both are industry-standard, battle-tested libraries

**Migration Strategy**
- Implement in 3 separate PRs for incremental delivery
- Each PR independently testable and deployable
- Backward compatible - no breaking changes to config format
- Preserve all existing functionality and behavior
- Start with highest ROI (Zod validation first)

## Visual Design

No visual assets provided for this backend/CLI refactor project.

## Existing Code to Leverage

**Context System (context.ts - 140 LOC)**
- Optional parameter pattern: `ctx?: Context` with fallback to `getContext()`
- Auto-initialization with `process.cwd()` if not explicitly set
- Global singleton for CLI, explicit instances for monorepo
- Simple interface currently: `{ rootDir: string }`
- Will be extended to include: `{ rootDir: string; logger: Logger }`

**Config Loading Pattern (loader.ts - 631 LOC)**
- `findConfigFile()` checks multiple names (tokensrc.json, .synkiorc, synkio.config.json)
- `interpolateEnvVars()` replaces `${VAR_NAME}` syntax with process.env values
- Existing validation produces excellent actionable errors
- Error messages already user-friendly: "Run 'synkio init' to configure"
- Pattern to preserve: clear errors → actionable guidance

**Error Handling Convention (throughout codebase)**
- 18 "OrThrow" pattern functions (loadConfigOrThrow, loadBaselineOrThrow)
- Consistent error format: problem statement + actionable guidance
- 29 `throw new Error` statements with custom messages
- Preserve this pattern when adding Zod validation

**Figma API Patterns (api.ts - 149 LOC)**
- Two methods: `fetchFromNode()` (fast) and `fetchFromFile()` (slow)
- Direct fetch() calls, no retry logic currently
- Simple error handling with user-friendly messages
- 6-8 API calls per typical workflow (init + multiple syncs)
- Request flow: get credentials → fetch → parse response → extract plugin data

**Console Usage (534 occurrences across 22 files)**
- Inconsistent formatting: mix of separators (━, =, ─)
- No log levels: mostly console.log, rarely warn/error
- No structured metadata, just plain strings
- Hardcoded colors using chalk
- sync.ts has ~50 console statements (largest concentration)

## Out of Scope

**Orchestrator Pattern (+400 LOC)**
- NOT implementing event-based architecture for CLI commands
- Reason: 5 simple CLI commands don't need complex event system
- Current console.log approach sufficient for CLI context
- When to revisit: if building webhooks, Slack integration, or public event API
- YAGNI principle: solving hypothetical future problem, not current pain

**AST-based Migrations (+1,050 LOC)**
- NOT replacing regex migrations with AST parsing
- Reason: current regex with word boundaries works 95% of the time
- Would add significant complexity (postcss, TypeScript compiler API)
- When to revisit: if users report frequent false positives in migrations
- Current system works adequately, enhancement is premature optimization

**FS Abstraction Layer (+200 LOC)**
- NOT creating FSAdapter interface with NodeFSAdapter/MemoryFSAdapter
- Reason: no monorepo use cases yet, tests work fine with real FS
- Would add indirection without solving actual problems
- When to revisit: if monorepo support requested or virtual FS needed for tests
- Keep it simple: direct fs usage is fine for current needs

**Circuit Breaker Pattern**
- NOT implementing circuit breaker for API calls
- Reason: CLI processes are short-lived (seconds), circuit breaker designed for long-running services
- Simple retry with exponential backoff is sufficient for CLI use case
- When to revisit: if building long-running daemon or service
- Over-engineering for current 6-8 calls per workflow

**Multiple Renderer System**
- NOT creating separate PrettyRenderer, JsonRenderer, QuietRenderer classes
- Reason: simple --json flag covers programmatic use cases
- Current console.log output is fine for humans
- When to revisit: if diverse output formats needed for different consumers
- Keep it simple: format output in CLI command, not separate layer

**Logger Migration Beyond sync.ts**
- NOT migrating all 534 console statements in first pass
- Only migrating sync.ts (~50 statements) to prove pattern works
- Reason: incremental approach, validate design before scaling
- When to revisit: after sync.ts migration proves successful
- 80/20 rule: highest-value command first, expand gradually

**Breaking Changes to Config Format**
- NOT changing tokensrc.json structure or field names
- Zod validation must accept existing valid configs
- Error messages must remain actionable (no regression)
- Maintain seamless upgrade path from 1.x to 2.x

## Implementation Details

### Phase 1: Foundation (30 minutes)

**Install Dependencies**
```bash
cd /Users/rasmus/synkio/packages/core
pnpm add zod p-retry
```

**File Creation**
- Create `/Users/rasmus/synkio/packages/core/src/files/config-schema.ts` (~100 LOC)
- Create `/Users/rasmus/synkio/packages/core/src/figma/client.ts` (~150 LOC)
- Create `/Users/rasmus/synkio/packages/core/src/logger.ts` (~50 LOC)

**Context Extension**
- Update `/Users/rasmus/synkio/packages/core/src/context.ts`
- Add `logger: Logger` field to Context interface
- Update `createContext()` to accept optional logger
- Update `getContext()` to auto-create ConsoleLogger if not provided

### Phase 2: Zod Validation (3-4 hours)

**Schema Definition**
```typescript
// config-schema.ts
import { z } from 'zod';

export const tokensConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),

  figma: z.object({
    fileId: z.string().min(1, 'figma.fileId is required'),
    accessToken: z.string().min(1, 'FIGMA_ACCESS_TOKEN environment variable is required'),
    nodeId: z.string().optional(),
  }),

  paths: z.object({
    root: z.string(),
    data: z.string().min(1),
    baseline: z.string().min(1),
    baselinePrev: z.string().min(1),
    reports: z.string().min(1),
    tokens: z.string().min(1),
    styles: z.string().min(1),
    tokenMap: z.string().optional(),
  }).strict(),

  collections: z.record(z.any()).optional(),

  split: z.record(z.object({
    strategy: z.enum(['byMode', 'byGroup']),
    files: z.record(z.string()),
  })).optional(),

  migration: z.object({
    stripSegments: z.array(z.string()).optional(),
    platforms: z.record(z.any()).optional(),
  }).optional(),

  build: z.object({
    command: z.string().optional(),
  }).optional(),
}).strict();

export type ResolvedConfig = z.infer<typeof tokensConfigSchema>;

export function transformZodError(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.join('.');

    if (path === 'figma.fileId') {
      return 'Missing required field: figma.fileId - Run \'synkio init\' to configure';
    }
    if (path === 'figma.accessToken') {
      return 'Missing required field: figma.accessToken - Set FIGMA_ACCESS_TOKEN environment variable';
    }

    return `${path}: ${err.message}`;
  });
}
```

**Loader Integration**
- Update `loadConfig()` in loader.ts to use Zod parsing
- Keep environment variable interpolation before validation
- Replace `validateConfig()` function with Zod schema parsing
- Transform Zod errors to maintain error message quality
- Update return type from `TokensConfig` to `ResolvedConfig`

**Cleanup**
- Remove manual validation functions (~200 LOC)
- Search codebase for `config.figma?.` patterns, remove optional chaining
- Remove defensive null checks where Zod guarantees field presence
- Update tests to expect Zod error format

### Phase 3: Figma Client (3-4 hours)

**Client Implementation**
```typescript
// figma/client.ts
import pRetry from 'p-retry';
import type { Logger } from '../logger.js';

export interface FigmaClientOptions {
  fileId: string;
  nodeId?: string;
  accessToken: string;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger;
}

export class FigmaClient {
  private fileId: string;
  private nodeId?: string;
  private accessToken: string;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  constructor(options: FigmaClientOptions) {
    this.fileId = options.fileId;
    this.nodeId = options.nodeId;
    this.accessToken = options.accessToken;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.logger = options.logger ?? console;
  }

  async fetchData(): Promise<BaselineData> {
    if (this.nodeId) {
      return this.fetchFromNode(this.nodeId);
    } else {
      return this.fetchFromFile();
    }
  }

  private async fetch<T>(url: string): Promise<T> {
    return pRetry(
      async () => {
        const response = await fetch(url, {
          headers: { 'X-Figma-Token': this.accessToken },
          signal: AbortSignal.timeout(this.timeout),
        });

        const requestId = response.headers.get('X-Request-Id');

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          this.logger.warn?.(`Rate limited, will retry`, { requestId, retryAfter });
          throw new Error(`Rate limited`);
        }

        if (response.status >= 500) {
          this.logger.warn?.(`Server error ${response.status}`, { requestId });
          throw new Error(`Server error: ${response.status}`);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new pRetry.AbortError(`Figma API error (${response.status}): ${errorText}`);
        }

        return response.json() as Promise<T>;
      },
      {
        retries: this.maxRetries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true,
        onFailedAttempt: (error) => {
          this.logger.info?.(
            `Retry attempt ${error.attemptNumber}/${this.maxRetries + 1}`
          );
        },
      }
    );
  }
}
```

**API Refactor**
- Update `fetchFigmaData()` in api.ts to use FigmaClient
- Remove direct fetch() calls
- Simplify error handling (client handles retries)
- Preserve existing error messages for user-facing errors
- Update all call sites to use new client

**Context Integration**
- Add optional `figmaClient?: FigmaClient` to Context interface
- Create `getFigmaClient(ctx)` helper that instantiates client on-demand
- Client reads credentials from config loaded via context

### Phase 4: Logger System (4 hours)

**Logger Interface**
```typescript
// logger.ts
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

export class ConsoleLogger implements Logger {
  private silent: boolean;

  constructor(options: { silent?: boolean } = {}) {
    this.silent = options.silent ?? false;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (!this.silent && process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.silent) {
      console.log(message, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.silent) {
      console.warn(`⚠️  ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    console.error(`❌ ${message}`, meta ? JSON.stringify(meta) : '');
  }
}

export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export function createLogger(options: { silent?: boolean } = {}): Logger {
  return options.silent ? new SilentLogger() : new ConsoleLogger(options);
}
```

**Migration Strategy**
- Start with sync.ts command only (~50 console statements)
- Pattern: `console.log('message')` → `ctx.logger.info('message')`
- Pattern: `console.log('✅', data)` → `ctx.logger.info('✅ Message', { data })`
- Update CLI commands to pass logger in context
- Update tests to use SilentLogger in test contexts

**Incremental Rollout**
- Phase 4a: Migrate sync.ts
- Phase 4b (future): Migrate init.ts
- Phase 4c (future): Migrate diff.ts
- Phase 4d (future): Migrate migrate.ts
- Only Phase 4a in scope for this spec

### Phase 5: Verification (1 hour)

**Test Execution**
```bash
cd /Users/rasmus/synkio/packages/core
pnpm test
```

**Manual Testing**
- Run `synkio init` with invalid config
- Run `synkio sync` with invalid Figma token (test retry)
- Run `synkio sync` successfully
- Test with DEBUG=1 environment variable
- Verify error messages remain actionable

**Code Quality Checks**
```bash
# Verify LOC reduction
find packages/core/src -name "*.ts" -not -name "*.test.ts" -exec wc -l {} + | tail -1

# Check for remaining defensive patterns
grep -r "config\.figma\?\." packages/core/src --include="*.ts"

# Verify console.log migration in sync.ts
grep "console\." packages/core/src/cli/commands/sync.ts
```

## Testing Strategy

### Unit Tests - Zod Validation

**Test File**: `/Users/rasmus/synkio/packages/core/src/files/config-schema.test.ts`

```typescript
describe('tokensConfigSchema', () => {
  it('validates minimal valid config', () => {
    const config = {
      version: '2.0.0',
      figma: { fileId: 'abc123', accessToken: 'token' },
      paths: {
        root: '.',
        data: '.figma/data',
        baseline: '.figma/data/baseline.json',
        baselinePrev: '.figma/data/baseline-prev.json',
        reports: '.figma/reports',
        tokens: 'tokens',
        styles: 'styles',
      },
    };
    const result = tokensConfigSchema.parse(config);
    expect(result.version).toBe('2.0.0');
  });

  it('rejects config with missing required fields', () => {
    const config = { version: '2.0.0' };
    expect(() => tokensConfigSchema.parse(config)).toThrow();
  });

  it('provides actionable error messages', () => {
    const config = { version: '2.0.0', figma: { fileId: '', accessToken: 'token' } };
    try {
      tokensConfigSchema.parse(config);
    } catch (error) {
      const errors = transformZodError(error as z.ZodError);
      expect(errors[0]).toContain('figma.fileId');
    }
  });

  it('handles optional fields correctly', () => {
    const config = { /* minimal config without optional fields */ };
    const result = tokensConfigSchema.parse(config);
    expect(result.collections).toBeUndefined();
    expect(result.migration).toBeUndefined();
  });
});
```

### Unit Tests - Figma Client

**Test File**: `/Users/rasmus/synkio/packages/core/src/figma/client.test.ts`

```typescript
describe('FigmaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on 500 server errors', async () => {
    let attempts = 0;
    globalThis.fetch = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        return { ok: false, status: 500, text: async () => 'Server error' };
      }
      return { ok: true, json: async () => ({ data: 'success' }) };
    });

    const client = new FigmaClient({
      fileId: 'test',
      accessToken: 'token',
    });

    const result = await client.fetchData();
    expect(attempts).toBe(3);
    expect(result).toEqual({ data: 'success' });
  });

  it('does not retry on 403 forbidden', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    }));

    const client = new FigmaClient({
      fileId: 'test',
      accessToken: 'token',
    });

    await expect(client.fetchData()).rejects.toThrow('Forbidden');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles timeout', async () => {
    globalThis.fetch = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 60000));
    });

    const client = new FigmaClient({
      fileId: 'test',
      accessToken: 'token',
      timeout: 100,
    });

    await expect(client.fetchData()).rejects.toThrow();
  });
});
```

### Unit Tests - Logger

**Test File**: `/Users/rasmus/synkio/packages/core/src/logger.test.ts`

```typescript
describe('Logger', () => {
  it('SilentLogger suppresses all output', () => {
    const spy = vi.spyOn(console, 'log');
    const logger = new SilentLogger();

    logger.debug('test');
    logger.info('test');
    logger.warn('test');
    logger.error('test');

    expect(spy).not.toHaveBeenCalled();
  });

  it('ConsoleLogger shows info in normal mode', () => {
    const spy = vi.spyOn(console, 'log');
    const logger = new ConsoleLogger();

    logger.info('Test message', { foo: 'bar' });

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toBe('Test message');
  });

  it('ConsoleLogger hides debug without DEBUG env', () => {
    delete process.env.DEBUG;
    const spy = vi.spyOn(console, 'log');
    const logger = new ConsoleLogger();

    logger.debug('Debug message');

    expect(spy).not.toHaveBeenCalled();
  });

  it('ConsoleLogger shows debug with DEBUG=1', () => {
    process.env.DEBUG = '1';
    const spy = vi.spyOn(console, 'log');
    const logger = new ConsoleLogger();

    logger.debug('Debug message');

    expect(spy).toHaveBeenCalled();
    delete process.env.DEBUG;
  });
});
```

### Integration Testing

**Manual Test Scenarios**
1. Invalid config: `synkio sync` with missing figma.fileId should show "Run 'synkio init'"
2. Invalid token: Should retry 3 times then fail with clear message
3. Rate limiting: Mock 429 response, verify exponential backoff
4. Successful sync: Verify no console noise with SilentLogger in tests
5. Debug mode: `DEBUG=1 synkio sync` should show verbose logging

**Test Coverage Goals**
- Zod schemas: 100% (all validation paths)
- FigmaClient: 90% (retry logic, timeout, error handling)
- Logger: 95% (all log levels, silent mode)
- Overall new code: minimum 85%

## Migration & Rollback

### Backward Compatibility

**Config Format**
- All existing tokensrc.json files remain valid
- Zod validation accepts same structure as manual validation
- No field renames or structure changes
- Optional fields remain optional

**Error Messages**
- Preserve actionable guidance ("Run 'synkio init'")
- Zod errors transformed to match current message quality
- No regression in user experience

**API Surface**
- No breaking changes to exported functions
- All existing function signatures preserved
- New FigmaClient encapsulates internal changes
- Context extension is additive (logger field optional)

### Breaking Changes

**None Planned**
- All changes are internal implementation
- Public API remains stable
- Config format unchanged
- CLI command interface unchanged

### Rollback Plan

**Per-PR Rollback**
- PR #1 (Zod): Revert schema, restore manual validation
- PR #2 (FigmaClient): Revert to direct fetch() calls
- PR #3 (Logger): Revert to console.log statements

**Data Safety**
- No database migrations involved
- No config file transformations
- All changes in-memory only
- Users' tokensrc.json files unaffected

**Deployment Strategy**
- Each PR merged independently
- Test in development after each merge
- Bump version after all 3 PRs merged
- Publish as minor version (1.0.5 → 1.1.0)
- Monitor npm downloads and issue reports

## Documentation Updates

### README.md Updates

**Troubleshooting Section** (add)
```markdown
## Troubleshooting

### Rate Limiting
If you see "Rate limited" errors, Synkio will automatically retry with exponential backoff (1s, 2s, 4s). If retries fail:
- Check your Figma API rate limits
- Wait 60 seconds and try again
- Use `nodeId` in config for faster, fewer API calls

### Debug Mode
Set `DEBUG=1` to see verbose logging:
```bash
DEBUG=1 synkio sync
```

### Configuration Errors
Invalid config errors show exactly what's wrong:
```
Invalid configuration in tokensrc.json:
  • figma.fileId: Required

Run 'synkio init' to fix or check https://synkio.io/docs/config
```
```

### CLI Reference Updates

**Environment Variables** (add)
- `DEBUG=1`: Enable verbose debug logging
- `FIGMA_ACCESS_TOKEN`: Figma API token (required)
- `FIGMA_FILE_KEY`: Figma file ID (optional, can be in config)

### Config Schema Documentation

**Example tokensrc.json with comments**
```jsonc
{
  "version": "2.0.0",
  "figma": {
    "fileId": "abc123...",           // Required: Figma file ID
    "accessToken": "${FIGMA_ACCESS_TOKEN}",  // Required: API token
    "nodeId": "123:456"              // Optional: Specific node ID for faster access
  },
  "paths": {
    "root": ".",
    "data": ".figma/data",
    "baseline": ".figma/data/baseline.json",
    "baselinePrev": ".figma/data/baseline-prev.json",
    "reports": ".figma/reports",
    "tokens": "tokens",
    "styles": "styles"
  },
  "collections": {},                 // Optional: Collection configuration
  "split": {},                       // Optional: Token splitting strategy
  "migration": {}                    // Optional: Migration settings
}
```

### CHANGELOG Entry

```markdown
## [1.1.0] - 2025-12-XX

### Added
- Zod schema validation for type-safe config loading
- Automatic retry logic for Figma API calls with exponential backoff
- Structured logging system (DEBUG=1 for verbose output)
- Request timeout protection (30s default)
- Rate limit handling with automatic backoff

### Changed
- Config validation now provides more actionable error messages
- Figma API calls automatically retry on transient failures
- Logger interface for testable, structured output

### Improved
- Reduced codebase by 150 LOC while adding reliability features
- Type-safe config with guaranteed field presence
- Better error messages for debugging production issues
- Consistent error handling across all commands

### Internal
- Replaced manual config validation with Zod schemas
- Encapsulated Figma API logic in FigmaClient class
- Added Logger interface to Context system
```

## Risk Assessment

### High Risk Areas

**Zod Error Message Regression**
- Risk: Zod's default errors less helpful than current messages
- Mitigation: Custom error transformation function preserves message quality
- Mitigation: Extensive testing of all error cases
- Mitigation: Keep current error messages as reference in tests
- Detection: Manual testing before merge, user feedback after release

**Breaking Existing Users**
- Risk: Config format changes break existing tokensrc.json files
- Mitigation: Zod schema accepts exact same format as current validation
- Mitigation: No field renames, no structure changes
- Mitigation: Test with real user configs
- Detection: Test suite includes sample configs from docs

### Medium Risk Areas

**FigmaClient Retry Too Aggressive**
- Risk: Retries waste time on permanent failures
- Mitigation: Only retry 5xx and 429, abort on 4xx
- Mitigation: Conservative retry count (3 max)
- Mitigation: User sees progress ("Retry 2/3...")
- Detection: Monitor issue reports about slow failures

**Logger Migration Incomplete**
- Risk: Mixing console.log and ctx.logger causes confusion
- Mitigation: Start with single command (sync.ts)
- Mitigation: Document migration pattern clearly
- Mitigation: Incremental rollout (prove pattern works)
- Detection: Code review catches mixed patterns

### Low Risk Areas

**New Dependencies**
- Risk: Zod or p-retry have vulnerabilities or break
- Mitigation: Both widely used, well-maintained libraries
- Mitigation: Zero transitive dependencies (no supply chain risk)
- Mitigation: Small bundle size (~60kB total)
- Detection: Dependabot alerts, npm audit

**Performance Regression**
- Risk: Zod validation or retry logic slows CLI
- Mitigation: Zod validation is milliseconds (negligible)
- Mitigation: Retries only on failures (not common case)
- Mitigation: Timeout prevents hanging (30s max)
- Detection: Manual testing of sync command timing

## Success Metrics

### Quantitative Metrics

**Code Reduction**
- Before: 12,310 LOC production code
- After: 12,160 LOC
- Net change: -150 LOC (-1.2%)
- Validation code: -200 LOC (manual validation removed)
- API client code: +100 LOC (retry logic added)
- Logger code: -50 LOC (net after migration)

**Console Statement Cleanup**
- Before: 534 console.* calls
- After (sync.ts only): 484 console.* calls
- Migrated: 50 statements in sync.ts
- Remaining: 484 (future PRs)

**Type Safety**
- Before: Manual validation, Partial types
- After: Zod-enforced validation, guaranteed types
- Defensive checks eliminated: ~50 instances of optional chaining

### Qualitative Improvements

**Production Stability**
- Automatic retry on transient Figma API failures
- Rate limit handling prevents sync failures
- Timeout protection prevents hanging processes
- Request ID logging enables debugging

**Developer Experience**
- Type-safe config with autocomplete
- Clear error messages with actionable guidance
- Testable logging (no console pollution)
- Easier to add monitoring (Sentry, DataDog)

**Maintainability**
- Single source of truth for config validation
- Centralized API client logic
- Consistent logging interface
- Easier to test (mockable dependencies)

### Success Criteria

- All existing tests pass
- Error messages remain actionable (manual verification)
- Config validation catches all edge cases
- Figma API retries work (manual test with invalid token)
- Logger works in tests (no console output with SilentLogger)
- Code coverage minimum 85% for new code
- No breaking changes to public API
- Documentation updated with examples

## Appendices

### Code Example: Before/After Zod

**Before (manual validation)**
```typescript
export function validateConfig(config: Partial<TokensConfig>): string[] {
  const errors: string[] = [];
  if (!config.version) errors.push('Missing version');
  if (!config.figma) errors.push('Missing figma');
  if (!config.figma?.fileId) errors.push('Missing figma.fileId');
  // ... 35 more lines
  return errors;
}

// Usage - defensive checks everywhere
const config = loadConfig();
if (!config.figma?.fileId) throw new Error('...');
if (!config.paths?.tokens) throw new Error('...');
```

**After (Zod validation)**
```typescript
export const tokensConfigSchema = z.object({
  version: z.string(),
  figma: z.object({
    fileId: z.string().min(1),
    accessToken: z.string().min(1),
  }),
  paths: z.object({
    tokens: z.string().min(1),
    // ... more fields
  }),
}).strict();

export type ResolvedConfig = z.infer<typeof tokensConfigSchema>;

// Usage - TypeScript guarantees fields exist
const config: ResolvedConfig = loadConfig();
console.log(config.figma.fileId); // No null check needed!
```

### Code Example: Before/After FigmaClient

**Before (no retry)**
```typescript
const response = await fetch(url, {
  headers: { 'X-Figma-Token': accessToken },
});

if (!response.ok) {
  throw new Error(`Figma API error (${response.status})`);
}
```

**After (with retry)**
```typescript
const client = new FigmaClient({
  fileId: config.figma.fileId,
  accessToken: config.figma.accessToken,
  timeout: 30000,
  maxRetries: 3,
});

const data = await client.fetchData();
// Automatically retries 429, 5xx with exponential backoff
// Times out after 30s
// Logs request IDs for debugging
```

### Code Example: Before/After Logger

**Before (console.log everywhere)**
```typescript
console.log('🔄 Syncing tokens from Figma...');
console.log(`✅ Fetched ${tokenCount} tokens`);
console.warn(`Warning: ${message}`);
console.error('Failed:', error.message);

// Tests polluted with console output
test('sync tokens', async () => {
  await syncCommand(); // Logs 50 lines to console
  expect(result).toBe('success');
});
```

**After (structured logger)**
```typescript
ctx.logger.info('🔄 Syncing tokens from Figma...');
ctx.logger.info('✅ Fetched tokens', { count: tokenCount });
ctx.logger.warn('Warning occurred', { message });
ctx.logger.error('Failed to sync', { error: error.message });

// Tests clean
test('sync tokens', async () => {
  const ctx = createContext({ logger: new SilentLogger() });
  await syncCommand(ctx); // No console output
  expect(result).toBe('success');
});
```

### Design Decision: Zod Schema vs Manual Validation

**Trade-offs Considered**
- Manual validation: Full control over error messages, no dependencies
- Zod validation: Type inference, runtime safety, less code

**Decision: Zod**
- Rationale: Type inference eliminates defensive checks (bigger win)
- Rationale: Custom error transformation preserves message quality
- Rationale: -200 LOC reduction significant for maintainability
- Rationale: Industry standard, battle-tested library

**When to Revisit**: If Zod error transformation becomes too complex or error messages regress

### Design Decision: FigmaClient Class vs Functions

**Trade-offs Considered**
- Functions: Matches existing functional style, simpler
- Class: Encapsulates state (credentials, retry count), easier to test

**Decision: Class**
- Rationale: Retry state benefits from encapsulation
- Rationale: Credentials bundled with client instance
- Rationale: Future features (caching, circuit breaker) easier with class
- Rationale: Testable with dependency injection

**When to Revisit**: Never - class pattern proven for API clients

### Design Decision: Logger in Context

**Trade-offs Considered**
- Global logger: Simplest, everyone uses same instance
- Context logger: Testable, allows silent mode per-context
- No abstraction: Keep console.log, add --quiet flag

**Decision: Context Logger**
- Rationale: Testing without console pollution critical
- Rationale: Future monitoring integration easier
- Rationale: Maintains Context pattern already established
- Rationale: Optional parameter preserves backward compatibility

**When to Revisit**: If global logger simplifies implementation significantly

### Alternative Approaches Considered

**AST-based Validation (Instead of Zod)**
- Parse config as TypeScript AST, validate structure
- Rejected: Massive overkill, adds ts-morph dependency
- Zod is designed for this exact use case

**Fetch Wrapper Function (Instead of FigmaClient Class)**
- Simple wrapper around fetch with retry logic
- Rejected: Stateless retry harder to manage
- Class better encapsulates credentials and state

**Per-Command Logging (Instead of Context Logger)**
- Each CLI command creates its own logger
- Rejected: Inconsistent, harder to test
- Context-based logger more flexible

### References to Existing Patterns

**OrThrow Pattern (18 occurrences)**
```typescript
export function loadConfigOrThrow(ctx?: Context): ResolvedConfig {
  const config = loadConfig(ctx);
  if (!config) {
    throw new Error('Config not found. Run "synkio init"');
  }
  return config;
}
```

**Context Optional Parameter (established convention)**
```typescript
export function loadBaseline(filePath?: string, ctx?: Context): BaselineData | null {
  const context = ctx || getContext();
  // ... implementation
}
```

**Environment Variable Pattern**
```typescript
// Check process.env as fallback because module-level constants
// are evaluated at import time, before user enters credentials
const token = options?.accessToken || FIGMA_ACCESS_TOKEN || process.env.FIGMA_ACCESS_TOKEN;
```

---

**Total Estimated Effort**: 8-12 hours (1-2 work days)

**Implementation Order**: PR #1 (Zod) → PR #2 (FigmaClient) → PR #3 (Logger)

**Expected Outcome**: -150 LOC, improved type safety, automatic retries, testable logging, foundation for future monitoring.
