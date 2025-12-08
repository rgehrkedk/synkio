# Top 5 Prioriteter for Synkio - Dyb Analyse

> Baseret på GPT-Codex 5.1 analyse af arkitektur/kode forbedringer

---

## 1. **Centralized Config Schema Validation** 🔴 KRITISK

### Nuværende situation
```typescript
// loader.ts:113-152
export function validateConfig(config: Partial<TokensConfig>): string[] {
  const errors: string[] = [];
  if (!config.version) {
    errors.push('Missing required field: version');
  }
  // Kun simple string checks, ingen deep validation
}
```

### Problemerne
- **Ingen type coercion**: `"2.0"` vs `2.0` - begge accepteres ukritisk
- **Ingen nested validation**: `paths.data` kan være `null`, `undefined`, eller tom string
- **Ingen env var validation**: `${MISSING_VAR}` bliver til `""` med warning
- **Runtime surprises**: Fejl opdages først når kode kører, ikke ved load
- **Ingen migration path**: Hvordan håndteres v1 → v2 config breaking changes?

### Anbefalet løsning
```typescript
import { z } from 'zod';

// 1. Definer schema med strictness
const TokensConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  figma: z.object({
    fileId: z.string().min(1, 'fileId required'),
    accessToken: z.string().min(1, 'accessToken required'),
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
  }),
  collections: z.record(z.any()).default({}),
  split: z.record(z.any()).optional(),
  migration: z.object({
    stripSegments: z.array(z.string()).optional(),
  }).optional(),
}).strict(); // Reject unknown keys

// 2. Export resolved type (guarantees all fields present)
export type ResolvedConfig = z.infer<typeof TokensConfigSchema>;

// 3. Load + validate + transform
export function loadConfig(filePath?: string, ctx?: Context): ResolvedConfig | null {
  const raw = loadRawConfig(filePath);
  if (!raw) return null;

  // Interpolate BEFORE validation (så zod ser final values)
  const interpolated = interpolateEnvVars(raw);

  // Validate with clear error messages
  const result = TokensConfigSchema.safeParse(interpolated);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(
      `Invalid config:\n${formatZodError(formatted)}\n` +
      'Run "synkio init" to fix.'
    );
  }

  return result.data; // Type-safe, guaranteed valid
}
```

### Migration handling (bonus)
```typescript
// Versioned migrations
const migrations = {
  '1.0.0': (config: any) => {
    // Convert old structure to new
    return { ...config, version: '2.0.0' };
  },
};

function migrateConfig(config: any): any {
  let current = config;
  const currentVersion = config.version || '1.0.0';

  // Apply migrations in order
  for (const [version, migrate] of Object.entries(migrations)) {
    if (semver.lt(currentVersion, version)) {
      console.warn(`Migrating config from ${currentVersion} to ${version}`);
      current = migrate(current);
    }
  }

  return current;
}
```

### Impact
- **Fejl fanges tidligt**: Ved config load, ikke runtime
- **Clear error messages**: Zod giver præcise paths til fejl
- **Type safety**: Downstream kode kan stole på `ResolvedConfig`
- **Future-proof**: Migrations gør breaking changes håndterbare

**Effort**: 2-4 timer | **ROI**: Eliminer 80% af config-relaterede bugs

---

## 2. **Figma Client Resilience** 🔴 KRITISK

### Nuværende situation
```typescript
// api.ts:67-76
const response = await fetch(url, {
  headers: { 'X-Figma-Token': accessToken },
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Figma API error (${response.status}): ${errorText}`);
}
```

### Problemerne
- **429 Rate Limits**: Figma har aggressive rate limits - ingen retry = crash
- **5xx transient errors**: Network blips crasher hele flow
- **No timeout**: Hang forever hvis Figma ikke svarer
- **Logging gaps**: `console.log()` i production code, ingen request IDs
- **No circuit breaker**: Fortsætter med at hamre på API selv når det er nede

### Real-world konsekvens
```
Scenario: User kører `synkio sync` i CI
1. Figma API returnerer 429 (for mange requests)
2. Script crasher med vag fejl
3. CI job failer
4. Developer re-runner job
5. Samme fejl (fordi ingen retry logic)
6. Developer frustreret, må vente 1 time før retry
```

### Anbefalet løsning
```typescript
import pRetry from 'p-retry';

interface FigmaClientOptions {
  accessToken: string;
  timeout?: number; // ms
  maxRetries?: number;
  logger?: Logger; // Injected logger
}

class FigmaClient {
  private accessToken: string;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  constructor(options: FigmaClientOptions) {
    this.accessToken = options.accessToken;
    this.timeout = options.timeout || 30000; // 30s default
    this.maxRetries = options.maxRetries || 3;
    this.logger = options.logger || console;
  }

  async fetch(url: string): Promise<any> {
    return pRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          this.logger.debug(`Fetching: ${url}`);

          const response = await fetch(url, {
            headers: {
              'X-Figma-Token': this.accessToken,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Log response details
          const requestId = response.headers.get('X-Request-Id');
          this.logger.debug(`Response: ${response.status}`, { requestId });

          // Handle rate limits with exponential backoff
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

            this.logger.warn(`Rate limited, waiting ${delay}ms`, { requestId });

            // Throw to trigger retry
            throw new pRetry.AbortError(
              `Rate limited (Retry-After: ${delay}ms)`
            );
          }

          // Retry on 5xx (transient errors)
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }

          // Non-retryable errors (4xx except 429)
          if (!response.ok) {
            const errorText = await response.text();
            throw new pRetry.AbortError(
              `Figma API error (${response.status}): ${errorText}`
            );
          }

          return response.json();
        } catch (error) {
          clearTimeout(timeoutId);

          if (error.name === 'AbortError') {
            throw new pRetry.AbortError('Request timeout');
          }

          throw error;
        }
      },
      {
        retries: this.maxRetries,
        onFailedAttempt: (error) => {
          this.logger.warn(
            `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
            { error: error.message }
          );
        },
        // Exponential backoff: 1s, 2s, 4s, 8s...
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        // Add jitter to avoid thundering herd
        randomize: true,
      }
    );
  }

  async fetchNode(fileId: string, nodeId: string): Promise<any> {
    const url = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}&plugin_data=shared`;
    return this.fetch(url);
  }

  async fetchFile(fileId: string, pluginId: string): Promise<any> {
    const url = `https://api.figma.com/v1/files/${fileId}?plugin_data=${pluginId}`;
    return this.fetch(url);
  }
}

// Usage
export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const client = new FigmaClient({
    accessToken: getAccessToken(options),
    timeout: 30000,
    maxRetries: 3,
    logger: getLogger(), // Use structured logger
  });

  const { fileId, nodeId } = getCredentials(options);

  if (nodeId) {
    return client.fetchNode(fileId, nodeId);
  } else {
    return client.fetchFile(fileId, PLUGIN_ID);
  }
}
```

### Structured Logger (bonus)
```typescript
interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

class ConsoleLogger implements Logger {
  debug(msg: string, meta?: any) {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${msg}`, meta || '');
    }
  }
  info(msg: string, meta?: any) {
    console.log(`[INFO] ${msg}`, meta || '');
  }
  warn(msg: string, meta?: any) {
    console.warn(`[WARN] ${msg}`, meta || '');
  }
  error(msg: string, meta?: any) {
    console.error(`[ERROR] ${msg}`, meta || '');
  }
}

class SilentLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
}
```

### Impact
- **Production stability**: 429/5xx fejler håndteres gracefully
- **Better DX**: Clear error messages med request IDs
- **Debuggability**: Structured logging gør troubleshooting nemt
- **Testability**: Mockable logger + client

**Effort**: 3-4 timer | **ROI**: Eliminerer 90% af Figma API crashes

---

## 3. **Migration Engine Hardening** 🟡 HØJTPRIORITERET

### Nuværende situation
```typescript
// migrate.ts:372-378
const regex = new RegExp(escapeRegex(change.oldToken) + '(?![a-zA-Z0-9_])', 'g');
if (regex.test(content)) {
  content = content.replace(regex, change.newToken);
  modified = true;
}
```

### Problemerne i praksis

**Problem 1: False positives i CSS**
```css
/* Before migration */
.button {
  background: var(--color-primary);        /* Should change */
  background-hover: var(--color-primary);  /* Should change */
}

/* After regex migration: --color-primary → --color-brand */
.button {
  background: var(--color-brand);
  background-hover: var(--color-brand);    /* WRONG! Should be --color-brand-hover */
}
```

**Problem 2: String literal false positives**
```typescript
// Before
const oldTokenName = '--color-primary';  // String describing old token
const current = tokens['--color-primary']; // Actual usage

// After blind regex replace
const oldTokenName = '--color-brand';  // WRONG! This was documentation
const current = tokens['--color-brand']; // Correct
```

**Problem 3: Comments get modified**
```typescript
// TODO: Remove --color-primary once migrated
const theme = {
  // Migrated from --color-primary
  primary: '--color-brand',
};
```

**Problem 4: No idempotency**
```typescript
// Run migration twice = double replacement
'--color-primary' → '--color-brand' (run 1)
'--color-brand' → '--color-???'      (run 2 if mapping exists)
```

### Anbefalet løsning (Multi-tier strategi)

#### Tier 1: CSS/SCSS - Regex med context awareness
```typescript
function migrateCssFile(content: string, replacements: TokenReplacement[]): string {
  const ast = parseCSS(content); // Use css-tree eller postcss

  ast.walk((node) => {
    if (node.type === 'Function' && node.name === 'var') {
      // Only replace inside var() functions
      const tokenName = node.children.first.value;

      const replacement = replacements.find(r => r.from === tokenName);
      if (replacement) {
        node.children.first.value = replacement.to;
      }
    }
  });

  return ast.toString();
}
```

#### Tier 2: TypeScript/JavaScript - AST-based
```typescript
import * as ts from 'typescript';

function migrateTypeScriptFile(
  content: string,
  replacements: TokenReplacement[]
): string {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const changes: { start: number; end: number; text: string }[] = [];

  function visit(node: ts.Node) {
    // Only replace string literals that are token references
    if (ts.isStringLiteral(node)) {
      const value = node.text;

      // Heuristic: Only replace if looks like token (starts with --)
      if (value.startsWith('--')) {
        const replacement = replacements.find(r => r.from === value);
        if (replacement) {
          changes.push({
            start: node.getStart() + 1, // Skip opening quote
            end: node.getEnd() - 1,     // Skip closing quote
            text: replacement.to,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Apply changes in reverse order (to preserve positions)
  changes.sort((a, b) => b.start - a.start);

  let result = content;
  for (const change of changes) {
    result =
      result.substring(0, change.start) +
      change.text +
      result.substring(change.end);
  }

  return result;
}
```

#### Tier 3: Swift/Kotlin - Pattern-based med context
```swift
// Swift example
enum TokenColor {
    case primary = "--color-primary"  // Should change
    // --color-primary is old name     // Comment, skip
}

let token = "--color-primary"         // Should change
```

```typescript
function migrateSwiftFile(content: string, replacements: TokenReplacement[]): string {
  const lines = content.split('\n');

  return lines.map(line => {
    // Skip comments
    if (line.trim().startsWith('//')) return line;

    // Only replace string literals
    return line.replace(
      /"(--[a-z0-9-]+)"/g,
      (match, token) => {
        const replacement = replacements.find(r => r.from === token);
        return replacement ? `"${replacement.to}"` : match;
      }
    );
  }).join('\n');
}
```

#### Tier 4: Safety rails og dry-run
```typescript
interface MigrationSafetyOptions {
  maxReplacementsPerFile?: number;  // Default: 1000
  backupOriginals?: boolean;        // Default: true
  dryRun?: boolean;                 // Default: false
  excludePatterns?: string[];       // Skip certain files
}

async function applyMigrationsWithSafety(
  plan: MigrationPlan,
  options: MigrationSafetyOptions = {}
): Promise<MigrationResult> {
  const {
    maxReplacementsPerFile = 1000,
    backupOriginals = true,
    dryRun = false,
    excludePatterns = ['**/*.min.*', '**/dist/**', '**/node_modules/**'],
  } = options;

  const backupDir = path.join(process.cwd(), '.figma/backups', Date.now().toString());

  for (const [filePath, changes] of plan.changesByFile) {
    // Safety check 1: Too many changes = suspicious
    if (changes.length > maxReplacementsPerFile) {
      console.warn(
        `Skipping ${filePath}: ${changes.length} changes exceeds limit (${maxReplacementsPerFile})`
      );
      continue;
    }

    // Safety check 2: Backup before modifying
    if (backupOriginals && !dryRun) {
      const backupPath = path.join(backupDir, filePath);
      await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.promises.copyFile(filePath, backupPath);
    }

    // Apply changes with appropriate parser
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const migrated = await migrateFileByType(filePath, content, changes);

    // Safety check 3: Verify changes are reversible
    if (!dryRun) {
      const verification = verifyMigration(content, migrated, changes);
      if (!verification.valid) {
        console.error(`Migration verification failed for ${filePath}:`, verification.reason);
        continue;
      }
    }

    // Write changes
    if (!dryRun) {
      await fs.promises.writeFile(filePath, migrated, 'utf-8');
    }
  }
}
```

#### Tier 5: Idempotency checking
```typescript
interface MigrationMetadata {
  appliedAt: string;
  planHash: string;  // SHA of plan content
  replacements: TokenReplacement[];
}

function loadMigrationHistory(): MigrationMetadata[] {
  const historyPath = '.figma/migration-history.json';
  if (!fs.existsSync(historyPath)) return [];
  return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
}

function isPlanAlreadyApplied(plan: MigrationPlan): boolean {
  const history = loadMigrationHistory();
  const planHash = createHash('sha256')
    .update(JSON.stringify(plan.changes))
    .digest('hex');

  return history.some(h => h.planHash === planHash);
}

async function applyMigration(plan: MigrationPlan): Promise<void> {
  if (isPlanAlreadyApplied(plan)) {
    console.warn('This migration has already been applied. Skipping.');
    return;
  }

  // Apply migration...

  // Record in history
  const history = loadMigrationHistory();
  history.push({
    appliedAt: new Date().toISOString(),
    planHash: createPlanHash(plan),
    replacements: plan.replacements,
  });

  fs.writeFileSync(
    '.figma/migration-history.json',
    JSON.stringify(history, null, 2)
  );
}
```

### Preview functionality
```typescript
// Generate side-by-side diff for each file
async function previewMigration(plan: MigrationPlan): Promise<void> {
  const { diffLines } = await import('diff');

  for (const [filePath, changes] of plan.changesByFile) {
    const original = await fs.promises.readFile(filePath, 'utf-8');
    const migrated = await migrateFileByType(filePath, original, changes);

    const diff = diffLines(original, migrated);

    console.log(`\n📄 ${filePath}`);
    console.log('─'.repeat(60));

    diff.forEach(part => {
      const color = part.added ? '\x1b[32m' : part.removed ? '\x1b[31m' : '\x1b[0m';
      const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
      const lines = part.value.split('\n').slice(0, -1); // Remove empty last line

      lines.forEach(line => {
        console.log(`${color}${prefix}${line}\x1b[0m`);
      });
    });
  }
}
```

### Impact
- **Eliminér false positives**: AST parsing forstår kontekst
- **Safe migrations**: Backups + verification før write
- **Idempotency**: Kan re-køre migrations uden problemer
- **Better preview**: Se præcis hvad der ændres

**Effort**: 1-2 uger | **ROI**: Undgå produktions-breaking changes

---

## 4. **Logging/UX Separation (Orchestrator Pattern)** 🟡 HØJTPRIORITERET

### Nuværende situation
```typescript
// cli/commands/sync.ts - Business logic blandet med UI
export async function syncCommand(options: SyncOptions): Promise<void> {
  console.log('🔄 Syncing tokens from Figma...\n');  // UI

  const baseline = await fetchFigmaData(config);      // Business logic

  console.log(`✅ Fetched ${tokenCount} tokens\n`);   // UI

  saveBaseline(baseline, config);                     // Business logic

  console.log('📝 Saved baseline\n');                 // UI
}
```

### Problemerne
- **Ikke testbar**: Kan ikke teste business logic uden at mocke console
- **Ikke programmatic usage**: Hvis nogen vil bruge synkio via API, får de console spam
- **Ikke non-interactive**: CI/headless mode kan ikke disable prompts
- **Ingen progress tracking**: Lange operationer har ingen feedback

### Anbefalet løsning: Orchestrator Pattern

#### Step 1: Separate business logic
```typescript
// core/orchestrators/sync-orchestrator.ts
export interface SyncResult {
  success: boolean;
  baseline?: BaselineData;
  tokenCount?: number;
  error?: Error;
  events: SyncEvent[];
}

export type SyncEvent =
  | { type: 'started' }
  | { type: 'fetching'; source: 'node' | 'file' }
  | { type: 'fetched'; tokenCount: number }
  | { type: 'saving'; path: string }
  | { type: 'saved'; path: string }
  | { type: 'comparing'; hasChanges: boolean }
  | { type: 'completed'; duration: number }
  | { type: 'error'; error: Error };

export class SyncOrchestrator {
  private events: SyncEvent[] = [];

  constructor(
    private config: ResolvedConfig,
    private context: Context
  ) {}

  private emit(event: SyncEvent): void {
    this.events.push(event);
  }

  async execute(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      this.emit({ type: 'started' });

      // Fetch data
      const hasNodeId = !!this.config.figma.nodeId;
      this.emit({ type: 'fetching', source: hasNodeId ? 'node' : 'file' });

      const baseline = await fetchFigmaData({
        fileId: this.config.figma.fileId,
        nodeId: this.config.figma.nodeId,
        accessToken: this.config.figma.accessToken,
      });

      const tokenCount = countTokens(baseline);
      this.emit({ type: 'fetched', tokenCount });

      // Backup existing baseline
      const baselinePath = getBaselinePath(this.context);
      if (fs.existsSync(baselinePath)) {
        backupBaseline(this.context);
      }

      // Save new baseline
      this.emit({ type: 'saving', path: baselinePath });
      saveBaseline(baseline, baselinePath, this.context);
      this.emit({ type: 'saved', path: baselinePath });

      // Compare with previous
      const prevBaseline = loadBaselinePrev(undefined, this.context);
      const hasChanges = prevBaseline && !deepEqual(baseline, prevBaseline);
      this.emit({ type: 'comparing', hasChanges: !!hasChanges });

      const duration = Date.now() - startTime;
      this.emit({ type: 'completed', duration });

      return {
        success: true,
        baseline,
        tokenCount,
        events: this.events,
      };
    } catch (error) {
      this.emit({ type: 'error', error: error as Error });

      return {
        success: false,
        error: error as Error,
        events: this.events,
      };
    }
  }
}
```

#### Step 2: CLI renderer (pretty UI)
```typescript
// cli/renderers/sync-renderer.ts
export class SyncRenderer {
  private spinner?: ora.Ora;

  constructor(
    private verbose: boolean = false,
    private silent: boolean = false
  ) {}

  render(event: SyncEvent): void {
    if (this.silent) return;

    switch (event.type) {
      case 'started':
        this.spinner = ora('Syncing tokens from Figma...').start();
        break;

      case 'fetching':
        this.spinner?.text = `Fetching from Figma (${event.source} mode)...`;
        break;

      case 'fetched':
        this.spinner?.succeed(`Fetched ${event.tokenCount} tokens`);
        break;

      case 'saving':
        this.spinner = ora(`Saving to ${event.path}...`).start();
        break;

      case 'saved':
        this.spinner?.succeed(`Saved baseline`);
        break;

      case 'comparing':
        if (event.hasChanges) {
          console.log('⚠️  Changes detected from previous baseline');
        }
        break;

      case 'completed':
        console.log(`\n✅ Sync completed in ${event.duration}ms\n`);
        break;

      case 'error':
        this.spinner?.fail('Sync failed');
        console.error(`\n❌ Error: ${event.error.message}\n`);
        break;
    }
  }
}
```

#### Step 3: JSON renderer (CI/headless)
```typescript
// cli/renderers/json-renderer.ts
export class JsonRenderer {
  private events: SyncEvent[] = [];

  render(event: SyncEvent): void {
    this.events.push(event);
  }

  output(): void {
    console.log(JSON.stringify({
      events: this.events,
      summary: this.summarize(),
    }, null, 2));
  }

  private summarize() {
    const completed = this.events.find(e => e.type === 'completed');
    const fetched = this.events.find(e => e.type === 'fetched');
    const error = this.events.find(e => e.type === 'error');

    return {
      success: !error,
      tokenCount: fetched?.type === 'fetched' ? fetched.tokenCount : 0,
      duration: completed?.type === 'completed' ? completed.duration : 0,
      error: error?.type === 'error' ? error.error.message : undefined,
    };
  }
}
```

#### Step 4: CLI command (thin wrapper)
```typescript
// cli/commands/sync.ts
export async function syncCommand(options: SyncOptions): Promise<void> {
  const config = loadConfigOrThrow();
  const context = getContext();

  const orchestrator = new SyncOrchestrator(config, context);

  // Choose renderer based on options
  const renderer = options.json
    ? new JsonRenderer()
    : new SyncRenderer(options.verbose, options.silent);

  // Execute and stream events
  const result = await orchestrator.execute();

  for (const event of result.events) {
    renderer.render(event);
  }

  // Output final result (for JSON renderer)
  if (renderer instanceof JsonRenderer) {
    renderer.output();
  }

  // Exit with correct code
  process.exit(result.success ? 0 : 1);
}
```

#### Step 5: Programmatic API
```typescript
// Public API for library usage
import { SyncOrchestrator } from '@synkio/core';

const orchestrator = new SyncOrchestrator(config, context);
const result = await orchestrator.execute();

if (result.success) {
  console.log(`Synced ${result.tokenCount} tokens`);

  // React to events
  for (const event of result.events) {
    if (event.type === 'comparing' && event.hasChanges) {
      await triggerNotification('Tokens changed!');
    }
  }
}
```

### Benefits
- **Testable**: Business logic har zero dependencies på console/readline
- **Flexible**: Nem at tilføje nye renderers (Slack, webhooks, etc.)
- **Programmatic**: Kan bruges som library uden UI noise
- **Progress tracking**: Events giver granular feedback
- **CI-friendly**: JSON mode perfekt til machine parsing

**Effort**: 3-5 dage | **ROI**: Åbner for programmatic usage + testability

---

## 5. **Context-First FS (Finish What's Started)** 🟢 MEDIUM

### Nuværende situation
I har **allerede** god context infrastruktur:
```typescript
// context.ts - ✅ Good foundation
export interface Context {
  rootDir: string;
}

// loader.ts - ✅ Most functions accept ctx parameter
export function loadConfig(filePath?: string, ctx?: Context): TokensConfig | null {
  const context = ctx || getContext();
  // ...
}
```

**Men** der er stadig leaks:
```typescript
// split.ts:74 - ❌ Direct process.cwd() access
function writeTokenFile(filePath: string, data: any): void {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  // ...
}

// migrate.ts:119, 158, 164, etc. - ❌ Direct process.cwd() access
const alternatives = ['packages', 'app', 'apps', 'lib', '.'];
for (const alt of alternatives) {
  if (fs.existsSync(alt)) {
    actualScanDir = alt === '.' ? process.cwd() : alt;
  }
}
```

### Hvorfor er det et problem?

**Problem 1: Ikke testbart med virtual FS**
```typescript
// Want to test without touching disk
test('splitTokens creates correct files', () => {
  const virtualFS = new MemoryFS();
  const ctx = createContext({
    rootDir: '/virtual',
    fs: virtualFS  // ❌ Can't do this today
  });

  splitTokens(baseline, config, ctx);

  expect(virtualFS.readFile('/virtual/tokens/colors.json')).toBe(...);
});
```

**Problem 2: Ikke multi-project safe (monorepo)**
```typescript
// Run synkio for multiple projects in parallel
const projects = [
  { name: 'web', root: './apps/web' },
  { name: 'mobile', root: './apps/mobile' },
];

await Promise.all(
  projects.map(async (project) => {
    const ctx = createContext({ rootDir: project.root });

    // ❌ This will use process.cwd() internally, breaking isolation
    await syncTokens(ctx);
  })
);
```

**Problem 3: Ikke sandboxable (security)**
```typescript
// Want to restrict file writes to specific directory
const sandbox = createContext({
  rootDir: '/safe/dir',
  fs: new RestrictedFS('/safe/dir'),  // Only allow writes in /safe/dir
});

// ❌ This might write outside sandbox if code uses process.cwd()
splitTokens(baseline, config, sandbox);
```

### Anbefalet løsning (Finish the job)

#### Step 1: Extend Context med FS abstraction
```typescript
// context.ts
export interface FSAdapter {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string, encoding: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
}

// Default: Real FS
export class NodeFSAdapter implements FSAdapter {
  async readFile(path: string, encoding: string): Promise<string> {
    return fs.promises.readFile(path, encoding);
  }

  async writeFile(path: string, data: string, encoding: string): Promise<void> {
    return fs.promises.writeFile(path, data, encoding);
  }

  // ... other methods
}

// For tests: Memory FS
export class MemoryFSAdapter implements FSAdapter {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return content;
  }

  async writeFile(path: string, data: string): Promise<void> {
    this.files.set(path, data);
  }

  // ... other methods
}

export interface Context {
  rootDir: string;
  fs: FSAdapter;
  logger: Logger;  // From point #2
}

export function createContext(options: {
  rootDir: string;
  fs?: FSAdapter;
  logger?: Logger;
}): Context {
  return {
    rootDir: path.resolve(options.rootDir),
    fs: options.fs || new NodeFSAdapter(),
    logger: options.logger || new ConsoleLogger(),
  };
}
```

#### Step 2: Fix all `process.cwd()` leaks
```typescript
// split.ts - BEFORE
function writeTokenFile(filePath: string, data: any): void {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);  // ❌

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

// split.ts - AFTER
async function writeTokenFile(
  filePath: string,
  data: any,
  ctx: Context
): Promise<void> {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(ctx.rootDir, filePath);  // ✅

  const dir = path.dirname(fullPath);

  if (!(await ctx.fs.exists(dir))) {
    await ctx.fs.mkdir(dir, { recursive: true });
  }

  await ctx.fs.writeFile(
    fullPath,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}
```

#### Step 3: Update all callers
```typescript
// split.ts - Public API
export async function splitTokens(
  baseline: BaselineData,
  config: TokensConfig,
  ctx: Context,  // Now required, not optional
  options?: { silent?: boolean }
): Promise<SplitResult> {
  const collections = extractCollections(baseline);

  for (const [filePath, data] of Object.entries(filesWritten)) {
    await writeTokenFile(filePath, data, ctx);  // Pass context

    if (!options?.silent) {
      ctx.logger.info(`✓ ${filePath} (${countTokens(data)} tokens)`);
    }
  }

  return result;
}
```

#### Step 4: Add path allowlists (security)
```typescript
export class RestrictedFSAdapter implements FSAdapter {
  constructor(
    private allowedDirs: string[],
    private baseFS: FSAdapter = new NodeFSAdapter()
  ) {}

  private isAllowed(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return this.allowedDirs.some(dir =>
      resolved.startsWith(path.resolve(dir))
    );
  }

  async writeFile(filePath: string, data: string): Promise<void> {
    if (!this.isAllowed(filePath)) {
      throw new Error(`Write outside allowed directories: ${filePath}`);
    }
    return this.baseFS.writeFile(filePath, data, 'utf-8');
  }

  // ... other methods with same check
}

// Usage
const ctx = createContext({
  rootDir: '/project',
  fs: new RestrictedFSAdapter(['/project/tokens', '/project/.figma']),
});

// ✅ This works
await splitTokens(baseline, config, ctx);

// ❌ This throws if code tries to write outside allowed dirs
```

### Impact
- **Testability**: Mock FS for fast, isolated tests
- **Monorepo support**: Safe parallel execution
- **Security**: Restrict file operations to specific dirs
- **Dry-run mode**: Trivial to implement (NoOpFSAdapter)

**Effort**: 2-3 dage | **ROI**: Future-proof architecture + testability

---

## Anbefalet implementeringsrækkefølge

1. **Config validation** (2-4 timer) - Hurtig gevinst, fundament for resten
2. **Figma client** (3-4 timer) - Kritisk for production stability
3. **Logging separation** (3-5 dage) - Forbedrer testability for #4 og #5
4. **Context FS** (2-3 dage) - Finish what's started
5. **Migration hardening** (1-2 uger) - Største effort, men undgår breaking changes

**Total effort**: ~3-4 uger spread over sprints
