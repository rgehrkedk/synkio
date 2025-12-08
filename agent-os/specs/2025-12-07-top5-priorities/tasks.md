# Task Breakdown: Synkio 3-Focused Refactor

## Overview

**Goal**: Reduce codebase by 150 LOC net while improving type safety, reliability, and maintainability
**Target Completion**: 1-2 work days (8-12 hours)
**Total Tasks**: 44 tasks across 5 phases
**Strategy**: 3 separate PRs for incremental delivery

**Key Results**:
- -100 LOC from Zod validation replacing manual checks
- +100 LOC from FigmaClient with retry logic
- -150 LOC from logger migration in sync.ts
- Net: -150 LOC with improved reliability

---

## Task List

### Phase 1: Foundation & Dependencies

**Dependencies**: None
**Duration**: 30 minutes
**Deliverable**: Project setup with new dependencies

#### Task 1.1: Install Dependencies
- **File(s)**: `/Users/rasmus/synkio/packages/core/package.json`
- **Description**: Add zod and p-retry dependencies
- **Acceptance Criteria**:
  - [ ] Add `"zod": "^3.22.0"` to dependencies
  - [ ] Add `"p-retry": "^6.2.0"` to dependencies
  - [ ] Run `pnpm install` successfully
  - [ ] Verify no version conflicts
- **Estimated Time**: 5min
- **Dependencies**: None
- **Tests**: None required

#### Task 1.2: Create Config Schema File
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/config-schema.ts` (NEW)
- **Description**: Create empty file with boilerplate structure
- **Acceptance Criteria**:
  - [ ] File created in correct location
  - [ ] Add imports for `z` from 'zod'
  - [ ] Add placeholder export for schema
  - [ ] File compiles without errors
- **Estimated Time**: 5min
- **Dependencies**: Task 1.1
- **Tests**: None yet

#### Task 1.3: Create FigmaClient File
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts` (NEW)
- **Description**: Create empty file with boilerplate structure
- **Acceptance Criteria**:
  - [ ] File created in correct location
  - [ ] Add imports for pRetry
  - [ ] Add placeholder export for FigmaClient class
  - [ ] File compiles without errors
- **Estimated Time**: 5min
- **Dependencies**: Task 1.1
- **Tests**: None yet

#### Task 1.4: Create Logger File
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.ts` (NEW)
- **Description**: Create empty file with boilerplate structure
- **Acceptance Criteria**:
  - [ ] File created in correct location
  - [ ] Add placeholder Logger interface export
  - [ ] File compiles without errors
- **Estimated Time**: 5min
- **Dependencies**: None
- **Tests**: None yet

#### Task 1.5: Update Context Interface
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/context.ts`
- **Description**: Add logger field to Context interface (optional for now)
- **Acceptance Criteria**:
  - [ ] Add `logger?: Logger` to Context interface
  - [ ] Import Logger type from logger.ts
  - [ ] No breaking changes to existing code
  - [ ] File compiles without errors
- **Estimated Time**: 10min
- **Dependencies**: Task 1.4
- **Tests**: Existing context tests should still pass

---

### Phase 2: Zod Validation (PR #1)

**Dependencies**: Phase 1
**Duration**: 3-4 hours
**Deliverable**: Type-safe config validation with Zod

#### Task Group 2.1: Define Zod Schema

##### Task 2.1.1: Define Core Config Schema
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/config-schema.ts`
- **Description**: Define tokensConfigSchema with all required and optional fields
- **Acceptance Criteria**:
  - [ ] Define `tokensConfigSchema` using `z.object()`
  - [ ] Add version field with semver regex validation
  - [ ] Add figma object with fileId, accessToken, optional nodeId
  - [ ] Add paths object with all required path fields
  - [ ] Add collections (optional), split (optional), migration (optional), build (optional)
  - [ ] Use `.strict()` to catch typos
  - [ ] Export `type ResolvedConfig = z.infer<typeof tokensConfigSchema>`
- **Estimated Time**: 45min
- **Dependencies**: Task 1.2
- **Tests**: Write 2-4 focused tests for schema validation

**Schema Structure Reference**:
```typescript
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
```

##### Task 2.1.2: Create Error Transformation Function
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/config-schema.ts`
- **Description**: Transform Zod errors to user-friendly, actionable messages
- **Acceptance Criteria**:
  - [ ] Create `transformZodError(error: z.ZodError): string[]` function
  - [ ] Map common errors to actionable guidance
  - [ ] Include "Run 'synkio init'" for missing required fields
  - [ ] Preserve existing error message quality
  - [ ] Handle nested path errors (e.g., `figma.fileId`)
- **Estimated Time**: 30min
- **Dependencies**: Task 2.1.1
- **Tests**: Add to existing test file

##### Task 2.1.3: Write Schema Tests
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/config-schema.test.ts` (NEW)
- **Description**: Write 2-4 focused tests for schema validation
- **Acceptance Criteria**:
  - [ ] Test validates minimal valid config
  - [ ] Test rejects config with missing required fields
  - [ ] Test provides actionable error messages
  - [ ] Test handles optional fields correctly
  - [ ] Maximum 4 tests total
- **Estimated Time**: 20min
- **Dependencies**: Task 2.1.2
- **Tests**: This task IS the tests

#### Task Group 2.2: Integrate Zod into Loader

##### Task 2.2.1: Update loadConfig Function
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/loader.ts`
- **Description**: Replace manual validation with Zod parsing
- **Acceptance Criteria**:
  - [ ] Import tokensConfigSchema and transformZodError
  - [ ] Keep environment variable interpolation BEFORE validation
  - [ ] Replace validateConfig() call with tokensConfigSchema.parse()
  - [ ] Wrap in try-catch to transform Zod errors
  - [ ] Return type changed to ResolvedConfig
  - [ ] Preserve existing error message patterns
- **Estimated Time**: 30min
- **Dependencies**: Task 2.1.2
- **Tests**: Existing loader tests should pass

##### Task 2.2.2: Remove Manual Validation Function
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/loader.ts`
- **Description**: Delete validateConfig() function and manual validation code
- **Acceptance Criteria**:
  - [ ] Remove validateConfig() function completely
  - [ ] Remove all manual validation helper functions
  - [ ] Verify no remaining references to validateConfig
  - [ ] Estimated ~200 LOC removed
- **Estimated Time**: 15min
- **Dependencies**: Task 2.2.1
- **Tests**: Run existing tests to ensure no regressions

##### Task 2.2.3: Update Type Exports
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/types/config.ts`
- **Description**: Export ResolvedConfig type from config-schema
- **Acceptance Criteria**:
  - [ ] Import and re-export ResolvedConfig from config-schema.ts
  - [ ] Keep existing TokensConfig for backward compatibility
  - [ ] Update internal usage to prefer ResolvedConfig
  - [ ] All type references compile correctly
- **Estimated Time**: 15min
- **Dependencies**: Task 2.2.1
- **Tests**: None required (type-only change)

#### Task Group 2.3: Remove Defensive Checks

##### Task 2.3.1: Scan for Optional Chaining Patterns
- **File(s)**: Multiple files across codebase
- **Description**: Find all instances of `config.figma?.` and similar patterns
- **Acceptance Criteria**:
  - [ ] Run search: `grep -r "config\.figma\?\." packages/core/src --include="*.ts"`
  - [ ] Document all locations found
  - [ ] Create list of files to update
- **Estimated Time**: 10min
- **Dependencies**: Task 2.2.1
- **Tests**: None

##### Task 2.3.2: Remove Optional Chaining in Core Files
- **File(s)**: Files identified in Task 2.3.1
- **Description**: Replace optional chaining with direct access where Zod guarantees presence
- **Acceptance Criteria**:
  - [ ] Change `config.figma?.fileId` to `config.figma.fileId`
  - [ ] Change `config.paths?.tokens` to `config.paths.tokens`
  - [ ] Remove null checks after config validation
  - [ ] TypeScript compiles without errors
  - [ ] Estimated ~50 defensive checks removed
- **Estimated Time**: 30min
- **Dependencies**: Task 2.3.1
- **Tests**: Run existing test suite

##### Task 2.3.3: Update Tests for New Error Format
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/files/loader.test.ts`
- **Description**: Update test expectations for Zod error format
- **Acceptance Criteria**:
  - [ ] Update error message assertions to match Zod format
  - [ ] Verify actionable guidance still present in errors
  - [ ] All loader tests pass
- **Estimated Time**: 20min
- **Dependencies**: Task 2.2.1
- **Tests**: This task updates tests

#### Task Group 2.4: Verification & Testing

##### Task 2.4.1: Run Full Test Suite
- **File(s)**: N/A
- **Description**: Verify all existing tests pass with Zod validation
- **Acceptance Criteria**:
  - [ ] Run `pnpm test` in packages/core
  - [ ] All tests pass
  - [ ] No new TypeScript errors
  - [ ] Coverage maintained or improved
- **Estimated Time**: 10min
- **Dependencies**: All Phase 2 tasks
- **Tests**: Run entire suite

##### Task 2.4.2: Manual Testing
- **File(s)**: N/A
- **Description**: Test config validation with real scenarios
- **Acceptance Criteria**:
  - [ ] Test with valid tokensrc.json - should load successfully
  - [ ] Test with missing figma.fileId - should show "Run 'synkio init'"
  - [ ] Test with typo field - should catch with .strict()
  - [ ] Test with invalid version format - should provide clear error
- **Estimated Time**: 15min
- **Dependencies**: Task 2.4.1
- **Tests**: Manual verification

##### Task 2.4.3: Create PR #1
- **File(s)**: N/A
- **Description**: Create pull request for Zod validation
- **Acceptance Criteria**:
  - [ ] PR title: "feat: Add Zod schema validation for config"
  - [ ] Description includes what/why/impact
  - [ ] All tests passing in CI
  - [ ] No breaking changes to public API
- **Estimated Time**: 15min
- **Dependencies**: Task 2.4.2
- **Tests**: CI runs full suite

---

### Phase 3: Figma Client with Retry (PR #2)

**Dependencies**: Phase 2 (PR #1 merged)
**Duration**: 3-4 hours
**Deliverable**: Resilient API client with retry logic

#### Task Group 3.1: Implement FigmaClient Class

##### Task 3.1.1: Define FigmaClient Interface
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts`
- **Description**: Define FigmaClientOptions interface and class structure
- **Acceptance Criteria**:
  - [ ] Define FigmaClientOptions with fileId, nodeId, accessToken, timeout, maxRetries, logger
  - [ ] Create FigmaClient class with constructor
  - [ ] Add private fields for options
  - [ ] Set default timeout: 30000ms
  - [ ] Set default maxRetries: 3
- **Estimated Time**: 20min
- **Dependencies**: Task 1.3
- **Tests**: None yet

##### Task 3.1.2: Implement Core Fetch Method with Retry
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts`
- **Description**: Implement private fetch method with pRetry logic
- **Acceptance Criteria**:
  - [ ] Use pRetry with exponential backoff (factor: 2, minTimeout: 1000, maxTimeout: 10000)
  - [ ] Add timeout using AbortSignal.timeout()
  - [ ] Extract and log request IDs from response headers
  - [ ] Retry on 429 (rate limit) and 5xx server errors
  - [ ] Abort on 4xx client errors (except 429)
  - [ ] Use logger for retry attempts and failures
- **Estimated Time**: 45min
- **Dependencies**: Task 3.1.1
- **Tests**: Write 2-4 focused tests for retry behavior

**Retry Logic Reference**:
```typescript
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
        this.logger?.warn?.('Rate limited, will retry', { requestId, retryAfter });
        throw new Error('Rate limited');
      }

      if (response.status >= 500) {
        this.logger?.warn?.(`Server error ${response.status}`, { requestId });
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
        this.logger?.info?.(`Retry attempt ${error.attemptNumber}/${this.maxRetries + 1}`);
      },
    }
  );
}
```

##### Task 3.1.3: Implement fetchFromNode Method
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts`
- **Description**: Implement node-specific fetch (fast path)
- **Acceptance Criteria**:
  - [ ] Construct Figma API URL with nodeId
  - [ ] Normalize nodeId (replace '-' with ':')
  - [ ] Call private fetch method
  - [ ] Extract and validate plugin data from response
  - [ ] Handle missing node/plugin data with clear errors
- **Estimated Time**: 30min
- **Dependencies**: Task 3.1.2
- **Tests**: Add to test file

##### Task 3.1.4: Implement fetchFromFile Method
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts`
- **Description**: Implement file-wide fetch (slow path)
- **Acceptance Criteria**:
  - [ ] Construct Figma API URL with fileId
  - [ ] Call private fetch method
  - [ ] Traverse document tree to find plugin data
  - [ ] Handle missing plugin data with clear error
- **Estimated Time**: 30min
- **Dependencies**: Task 3.1.2
- **Tests**: Add to test file

##### Task 3.1.5: Implement Public fetchData Method
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.ts`
- **Description**: Create public API that chooses fetch strategy
- **Acceptance Criteria**:
  - [ ] If nodeId provided, use fetchFromNode
  - [ ] Otherwise, use fetchFromFile
  - [ ] Return BaselineData type
  - [ ] Handle errors gracefully
- **Estimated Time**: 15min
- **Dependencies**: Task 3.1.3, Task 3.1.4
- **Tests**: Add integration test

##### Task 3.1.6: Write FigmaClient Tests
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/client.test.ts` (NEW)
- **Description**: Write 2-4 focused tests for FigmaClient
- **Acceptance Criteria**:
  - [ ] Test retries on 500 server errors (max 2-4 tests)
  - [ ] Test does NOT retry on 403 forbidden
  - [ ] Test handles timeout correctly
  - [ ] Test extracts request IDs
  - [ ] Mock global fetch with vi.fn()
- **Estimated Time**: 30min
- **Dependencies**: Task 3.1.5
- **Tests**: This task IS the tests

#### Task Group 3.2: Integrate FigmaClient into Codebase

##### Task 3.2.1: Update Figma API Module
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/figma/api.ts`
- **Description**: Replace direct fetch calls with FigmaClient
- **Acceptance Criteria**:
  - [ ] Import FigmaClient
  - [ ] Replace fetchFromNode and fetchFromFile functions
  - [ ] Update fetchFigmaData to instantiate and use FigmaClient
  - [ ] Preserve existing error messages for user-facing errors
  - [ ] Remove ~50 LOC of direct fetch code
- **Estimated Time**: 30min
- **Dependencies**: Task 3.1.5
- **Tests**: Existing API tests should pass

##### Task 3.2.2: Add FigmaClient to Context
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/context.ts`
- **Description**: Add optional figmaClient field and helper function
- **Acceptance Criteria**:
  - [ ] Add `figmaClient?: FigmaClient` to Context interface
  - [ ] Create `getFigmaClient(ctx?: Context): FigmaClient` helper
  - [ ] Helper instantiates client on-demand from config
  - [ ] Reuse existing client if already in context
- **Estimated Time**: 20min
- **Dependencies**: Task 3.2.1
- **Tests**: Add to context tests

##### Task 3.2.3: Update API Call Sites
- **File(s)**: Various CLI command files
- **Description**: Update all 6-8 API call sites to use new pattern
- **Acceptance Criteria**:
  - [ ] Update init.ts to use FigmaClient
  - [ ] Update sync.ts to use FigmaClient
  - [ ] Update diff.ts to use FigmaClient
  - [ ] Preserve existing error handling patterns
  - [ ] All commands work correctly
- **Estimated Time**: 30min
- **Dependencies**: Task 3.2.2
- **Tests**: Manual testing of each command

#### Task Group 3.3: Verification & Testing

##### Task 3.3.1: Run Full Test Suite
- **File(s)**: N/A
- **Description**: Verify all tests pass with FigmaClient
- **Acceptance Criteria**:
  - [ ] Run `pnpm test` in packages/core
  - [ ] All tests pass
  - [ ] No TypeScript errors
  - [ ] Coverage maintained
- **Estimated Time**: 10min
- **Dependencies**: All Phase 3 tasks
- **Tests**: Run entire suite

##### Task 3.3.2: Manual Testing with Real API
- **File(s)**: N/A
- **Description**: Test retry behavior with real Figma API
- **Acceptance Criteria**:
  - [ ] Test successful sync with valid credentials
  - [ ] Test retry behavior by temporarily using invalid token
  - [ ] Verify timeout protection (if possible)
  - [ ] Check request IDs appear in logs
  - [ ] Verify user-friendly error messages
- **Estimated Time**: 20min
- **Dependencies**: Task 3.3.1
- **Tests**: Manual verification

##### Task 3.3.3: Create PR #2
- **File(s)**: N/A
- **Description**: Create pull request for FigmaClient
- **Acceptance Criteria**:
  - [ ] PR title: "feat: Add FigmaClient with retry logic and timeout"
  - [ ] Description includes reliability improvements
  - [ ] All tests passing in CI
  - [ ] No breaking changes
- **Estimated Time**: 15min
- **Dependencies**: Task 3.3.2
- **Tests**: CI runs full suite

---

### Phase 4: Structured Logger System (PR #3)

**Dependencies**: Phase 3 (PR #2 merged)
**Duration**: 4 hours
**Deliverable**: Testable logging, clean console output

#### Task Group 4.1: Implement Logger Interface

##### Task 4.1.1: Define Logger Interface
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.ts`
- **Description**: Define Logger interface with standard log levels
- **Acceptance Criteria**:
  - [ ] Define Logger interface with debug, info, warn, error methods
  - [ ] Each method accepts message: string and optional meta: Record<string, any>
  - [ ] Export interface
- **Estimated Time**: 10min
- **Dependencies**: Task 1.4
- **Tests**: None yet

##### Task 4.1.2: Implement ConsoleLogger
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.ts`
- **Description**: Create production logger implementation
- **Acceptance Criteria**:
  - [ ] Implement Logger interface
  - [ ] debug() only logs when DEBUG env var set
  - [ ] info() logs to console.log
  - [ ] warn() logs to console.warn with warning emoji
  - [ ] error() logs to console.error with error emoji
  - [ ] Support silent mode via constructor option
  - [ ] Format metadata as JSON when provided
- **Estimated Time**: 30min
- **Dependencies**: Task 4.1.1
- **Tests**: Write 2-4 focused tests

##### Task 4.1.3: Implement SilentLogger
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.ts`
- **Description**: Create test logger that suppresses output
- **Acceptance Criteria**:
  - [ ] Implement Logger interface
  - [ ] All methods are no-ops
  - [ ] Export class
- **Estimated Time**: 10min
- **Dependencies**: Task 4.1.1
- **Tests**: Add to test file

##### Task 4.1.4: Create Logger Factory
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.ts`
- **Description**: Add createLogger helper function
- **Acceptance Criteria**:
  - [ ] Export `createLogger(options?: { silent?: boolean }): Logger`
  - [ ] Returns SilentLogger if silent: true
  - [ ] Returns ConsoleLogger otherwise
- **Estimated Time**: 10min
- **Dependencies**: Task 4.1.2, Task 4.1.3
- **Tests**: Add to test file

##### Task 4.1.5: Write Logger Tests
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/logger.test.ts` (NEW)
- **Description**: Write 2-4 focused tests for logger implementations
- **Acceptance Criteria**:
  - [ ] Test SilentLogger suppresses all output
  - [ ] Test ConsoleLogger formats messages consistently
  - [ ] Test debug() respects DEBUG env var
  - [ ] Test metadata formatting
  - [ ] Maximum 4 tests total
- **Estimated Time**: 20min
- **Dependencies**: Task 4.1.4
- **Tests**: This task IS the tests

#### Task Group 4.2: Integrate Logger into Context

##### Task 4.2.1: Update Context Creation
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/context.ts`
- **Description**: Make logger required in Context with smart default
- **Acceptance Criteria**:
  - [ ] Change logger from optional to required in Context interface
  - [ ] Update createContext to accept optional logger parameter
  - [ ] Auto-create ConsoleLogger if not provided
  - [ ] Update getContext to include default logger
- **Estimated Time**: 20min
- **Dependencies**: Task 4.1.4
- **Tests**: Update context tests

##### Task 4.2.2: Update Test Contexts
- **File(s)**: Various test files
- **Description**: Add SilentLogger to all test contexts
- **Acceptance Criteria**:
  - [ ] Find all `createContext()` calls in tests
  - [ ] Add `logger: new SilentLogger()` parameter
  - [ ] Verify tests produce no console output
  - [ ] All tests still pass
- **Estimated Time**: 30min
- **Dependencies**: Task 4.2.1
- **Tests**: Run test suite to verify silence

#### Task Group 4.3: Migrate sync.ts to Logger

##### Task 4.3.1: Scan sync.ts for Console Statements
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/cli/commands/sync.ts`
- **Description**: Document all console.* statements in sync.ts
- **Acceptance Criteria**:
  - [ ] Run `grep "console\." packages/core/src/cli/commands/sync.ts`
  - [ ] Document count (~50 expected)
  - [ ] Categorize by type (log, warn, error)
  - [ ] Create migration plan
- **Estimated Time**: 15min
- **Dependencies**: None
- **Tests**: None

##### Task 4.3.2: Replace console.log with ctx.logger.info
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/cli/commands/sync.ts`
- **Description**: Migrate info-level logging statements
- **Acceptance Criteria**:
  - [ ] Replace all `console.log(...)` with `ctx.logger.info(...)`
  - [ ] Convert inline data to metadata objects
  - [ ] Preserve emoji and formatting in messages
  - [ ] Verify output looks correct
- **Estimated Time**: 45min
- **Dependencies**: Task 4.3.1
- **Tests**: Manual verification of output

##### Task 4.3.3: Replace console.warn and console.error
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/cli/commands/sync.ts`
- **Description**: Migrate warn and error logging
- **Acceptance Criteria**:
  - [ ] Replace `console.warn(...)` with `ctx.logger.warn(...)`
  - [ ] Replace `console.error(...)` with `ctx.logger.error(...)`
  - [ ] Extract error details into metadata
  - [ ] Preserve error visibility
- **Estimated Time**: 20min
- **Dependencies**: Task 4.3.2
- **Tests**: Test error scenarios

##### Task 4.3.4: Verify No Remaining Console Statements
- **File(s)**: `/Users/rasmus/synkio/packages/core/src/cli/commands/sync.ts`
- **Description**: Confirm complete migration in sync.ts
- **Acceptance Criteria**:
  - [ ] Run `grep "console\." packages/core/src/cli/commands/sync.ts`
  - [ ] Result should be zero matches
  - [ ] Estimated ~50 console statements removed
  - [ ] Command still works correctly
- **Estimated Time**: 10min
- **Dependencies**: Task 4.3.3
- **Tests**: Manual testing

#### Task Group 4.4: Verification & Testing

##### Task 4.4.1: Run Full Test Suite
- **File(s)**: N/A
- **Description**: Verify all tests pass with logger system
- **Acceptance Criteria**:
  - [ ] Run `pnpm test` in packages/core
  - [ ] All tests pass
  - [ ] No console output during test run (silent mode working)
  - [ ] Coverage maintained
- **Estimated Time**: 10min
- **Dependencies**: All Phase 4 tasks
- **Tests**: Run entire suite

##### Task 4.4.2: Manual Testing with DEBUG Mode
- **File(s)**: N/A
- **Description**: Test DEBUG environment variable functionality
- **Acceptance Criteria**:
  - [ ] Run `synkio sync` normally - verify clean output
  - [ ] Run `DEBUG=1 synkio sync` - verify verbose output
  - [ ] Verify debug messages appear in DEBUG mode
  - [ ] Verify debug messages hidden in normal mode
- **Estimated Time**: 15min
- **Dependencies**: Task 4.4.1
- **Tests**: Manual verification

##### Task 4.4.3: Create PR #3
- **File(s)**: N/A
- **Description**: Create pull request for logger system
- **Acceptance Criteria**:
  - [ ] PR title: "feat: Add structured logger system and migrate sync.ts"
  - [ ] Description includes testability improvements
  - [ ] All tests passing in CI
  - [ ] No breaking changes
- **Estimated Time**: 15min
- **Dependencies**: Task 4.4.2
- **Tests**: CI runs full suite

---

### Phase 5: Verification & Documentation

**Dependencies**: All PRs merged
**Duration**: 1 hour
**Deliverable**: Complete documentation and verification

#### Task Group 5.1: Code Quality Verification

##### Task 5.1.1: Measure LOC Reduction
- **File(s)**: N/A
- **Description**: Calculate actual lines of code reduction
- **Acceptance Criteria**:
  - [ ] Run `find packages/core/src -name "*.ts" -not -name "*.test.ts" -exec wc -l {} + | tail -1`
  - [ ] Compare before and after totals
  - [ ] Verify net reduction of ~150 LOC
  - [ ] Document actual numbers
- **Estimated Time**: 10min
- **Dependencies**: All phases complete
- **Tests**: None

##### Task 5.1.2: Verify Defensive Patterns Removed
- **File(s)**: N/A
- **Description**: Check for remaining optional chaining
- **Acceptance Criteria**:
  - [ ] Run `grep -r "config\.figma\?\." packages/core/src --include="*.ts"`
  - [ ] Should find zero or minimal matches
  - [ ] Document any remaining instances and rationale
- **Estimated Time**: 10min
- **Dependencies**: All phases complete
- **Tests**: None

##### Task 5.1.3: Count Console Statement Reduction
- **File(s)**: N/A
- **Description**: Verify console cleanup in sync.ts
- **Acceptance Criteria**:
  - [ ] Run `grep -r "console\." packages/core/src/cli/commands/sync.ts`
  - [ ] Should find zero matches
  - [ ] Verify ~50 statements removed
  - [ ] Document reduction
- **Estimated Time**: 5min
- **Dependencies**: Phase 4 complete
- **Tests**: None

#### Task Group 5.2: Documentation Updates

##### Task 5.2.1: Update README Troubleshooting
- **File(s)**: `/Users/rasmus/synkio/packages/core/README.md`
- **Description**: Add troubleshooting section for new features
- **Acceptance Criteria**:
  - [ ] Add "Troubleshooting" section
  - [ ] Document rate limiting and retry behavior
  - [ ] Document DEBUG=1 environment variable
  - [ ] Document config validation errors
  - [ ] Include example error messages
- **Estimated Time**: 20min
- **Dependencies**: All phases complete
- **Tests**: None

##### Task 5.2.2: Update CLI Reference
- **File(s)**: `/Users/rasmus/synkio/packages/core/README.md` or separate docs
- **Description**: Document new environment variables
- **Acceptance Criteria**:
  - [ ] Add DEBUG environment variable documentation
  - [ ] Document effect on log output
  - [ ] Add examples of verbose mode
- **Estimated Time**: 10min
- **Dependencies**: Phase 4 complete
- **Tests**: None

##### Task 5.2.3: Create CHANGELOG Entry
- **File(s)**: `/Users/rasmus/synkio/CHANGELOG.md`
- **Description**: Document changes for version release
- **Acceptance Criteria**:
  - [ ] Add entry for version 1.1.0 (or appropriate version)
  - [ ] List all three refactors under "Added" section
  - [ ] Document LOC reduction under "Improved"
  - [ ] Note backward compatibility
  - [ ] Include migration notes if needed
- **Estimated Time**: 15min
- **Dependencies**: All phases complete
- **Tests**: None

---

## Execution Order

The tasks should be executed in the following sequence:

1. **Phase 1: Foundation** (30 minutes)
   - Set up dependencies and file structure
   - No tests required, minimal risk

2. **Phase 2: Zod Validation** (3-4 hours) → **PR #1**
   - Highest ROI - improves type safety immediately
   - Write 2-4 focused tests for schema validation
   - Remove ~200 LOC of manual validation
   - Creates type-safe foundation for other phases

3. **Phase 3: Figma Client** (3-4 hours) → **PR #2**
   - Write 2-4 focused tests for retry logic
   - Adds ~100 LOC but improves reliability significantly
   - Can leverage logger from Phase 4 if available
   - Independent of Phase 4

4. **Phase 4: Logger System** (4 hours) → **PR #3**
   - Write 2-4 focused tests for logger implementations
   - Migrates ~50 console statements in sync.ts
   - Net reduction of ~150 LOC
   - Enables clean testing going forward

5. **Phase 5: Verification & Documentation** (1 hour)
   - Verify success metrics
   - Update documentation
   - Prepare for release

**Total Estimated Time**: 11-13 hours (approximately 1.5-2 work days)

## Testing Strategy

### Unit Testing Approach

**Key Principle**: Write 2-4 highly focused tests per task group, not comprehensive coverage.

#### Phase 2: Zod Validation Tests
- **Task 2.1.3**: Maximum 4 tests
  - Valid config parsing
  - Missing required field handling
  - Error message quality
  - Optional field handling
- **Run only these tests during Phase 2**

#### Phase 3: FigmaClient Tests
- **Task 3.1.6**: Maximum 4 tests
  - Retry on 500 errors
  - No retry on 403 errors
  - Timeout handling
  - Request ID extraction
- **Run only these tests during Phase 3**

#### Phase 4: Logger Tests
- **Task 4.1.5**: Maximum 4 tests
  - SilentLogger suppression
  - ConsoleLogger output
  - DEBUG mode behavior
  - Metadata formatting
- **Run only these tests during Phase 4**

### Integration Testing

**Manual Test Scenarios** (Task Group 2.4, 3.3, 4.4):
1. Invalid config with missing field → should show "Run 'synkio init'"
2. Invalid token → should retry 3 times then fail clearly
3. Rate limiting (if testable) → should respect exponential backoff
4. Successful sync → should show clean output
5. Debug mode → `DEBUG=1 synkio sync` should show verbose logging

### Test Coverage Goals
- Zod schemas: Focus on critical validation paths
- FigmaClient: Focus on retry logic and error handling
- Logger: Focus on output suppression and formatting
- **Overall**: Focus on behavior, not implementation details

## Important Constraints

### Testing Philosophy
- **Limit tests during development**: Each phase writes only 2-4 focused tests maximum
- **Test critical behaviors only**: Primary user workflows, key error handling
- **Skip exhaustive coverage**: Don't test every method, every edge case
- **Run only relevant tests**: During each phase, run only that phase's tests

### Code Quality
- **Maintain error message quality**: Zod errors must match current actionable guidance
- **Preserve backward compatibility**: No breaking changes to config format
- **Follow existing patterns**: Use OrThrow convention, Context optional parameters
- **Type safety over runtime checks**: Trust Zod validation, remove defensive code

### Dependencies
- **Zod (^3.22.0)**: 56kB gzipped, zero dependencies
- **p-retry (^6.2.0)**: 2.6kB, zero dependencies
- **Total bundle impact**: ~60kB
- **Both are battle-tested**: Industry standard libraries

### Scope Limitations
- **Do NOT** implement orchestrator pattern (out of scope)
- **Do NOT** implement AST-based migrations (out of scope)
- **Do NOT** implement FS abstraction layer (out of scope)
- **Do NOT** migrate logger beyond sync.ts (future work)
- **Do NOT** write comprehensive test coverage (focus on critical paths)

## Success Metrics

### Quantitative Goals
- **LOC Reduction**: Net -150 LOC (12,310 → 12,160)
- **Validation Code**: -200 LOC removed
- **API Client Code**: +100 LOC added
- **Logger Migration**: -50 LOC in sync.ts
- **Console Statements**: ~50 removed from sync.ts

### Qualitative Goals
- **Type Safety**: Remove ~50 defensive null checks
- **Error Messages**: Maintain or improve actionable guidance
- **Test Coverage**: 16-34 strategic tests across all phases
- **Reliability**: Automatic retry on transient failures
- **Testability**: Clean test runs with SilentLogger

### Acceptance Criteria
- [ ] All existing tests pass after each phase
- [ ] Error messages still say "Run 'synkio init'" where appropriate
- [ ] Figma API retries work (demonstrated in tests)
- [ ] Logger suppresses output in tests (no console pollution)
- [ ] Code coverage maintained or improved
- [ ] No breaking changes to public API
- [ ] Documentation updated with examples

---

## Risk Mitigation

### High Risk: Error Message Quality
- **Mitigation**: Custom transformZodError function preserves messages
- **Verification**: Manual testing before PR merge
- **Rollback**: Keep reference to old error format in tests

### High Risk: Breaking Existing Users
- **Mitigation**: Zod schema accepts same format as manual validation
- **Verification**: Test with real user configs
- **Rollback**: Revert PR if issues detected

### Medium Risk: Retry Too Aggressive
- **Mitigation**: Conservative defaults (3 retries, 10s max)
- **Verification**: Monitor issue reports after release
- **Rollback**: Easily configurable via options

### Medium Risk: Logger Migration Incomplete
- **Mitigation**: Only migrate sync.ts in this spec
- **Verification**: Grep confirms no console.* in sync.ts
- **Future**: Expand to other commands incrementally

---

**End of Tasks List**
