# Phase 1: Extract Standalone Package - Technical Deep Dive

## Executive Summary

**Goal:** Extract `figma-sync/` into `@synkio/sync` - a publishable, framework-agnostic NPM package.

**Complexity Level:** Medium (3-4 weeks full-time equivalent)

**Critical Challenges:**
1. Hard-coded paths (`figma-sync/.figma/`, `tokens/`, `styles/`)
2. Environment variable loading (dotenv with multiple file sources)
3. Style Dictionary coupling
4. CLI user experience (needs `inquirer` or similar)
5. Dual usage: CLI + Programmatic API

---

## Current Architecture Analysis

### 1. Dependency Graph

```
figma-sync/
├── External Dependencies:
│   ├── dotenv (env variable loading)
│   ├── glob (file pattern matching)
│   ├── style-dictionary (token compilation)
│   └── fs, path (Node.js built-ins)
│
├── Internal Dependencies:
│   ├── 42 instances of hard-coded relative paths
│   ├── Synkio-specific directory structure
│   └── Project root assumptions (process.cwd())
│
└── Zero React/Next.js dependencies ✅ (Good!)
```

### 2. Hard-Coded Paths Audit

**Found in [lib/files/paths.ts:9-29](figma-sync/lib/files/paths.ts#L9-L29):**

```typescript
// ❌ BLOCKING ISSUES - These prevent standalone usage:

export const FIGMA_SYNC_DIR = 'figma-sync';              // Assumes package is in figma-sync/
export const FIGMA_DIR = 'figma-sync/.figma';
export const FIGMA_CONFIG_DIR = 'figma-sync/.figma/config';
export const FIGMA_DATA_DIR = 'figma-sync/.figma/data';
export const FIGMA_REPORTS_DIR = 'figma-sync/.figma/reports';

export const TOKENS_DIR = 'tokens';                      // Assumes tokens/ exists
export const STYLES_DIR = 'styles/tokens';               // Assumes styles/ exists

export const CONFIG_FILE = 'figma-sync/.figma/config/tokensrc.json';
export const BASELINE_FILE = 'figma-sync/.figma/data/baseline.json';
export const BASELINE_PREV_FILE = 'figma-sync/.figma/data/baseline.prev.json';
```

**Impact:** Every function that imports these constants fails in other projects.

**Solution:** Make paths configurable via config file + defaults.

---

## Extraction Strategy

### Phase 1A: Path Abstraction (Week 1)

#### Step 1: Create Context System

**New file: `src/core/context.ts`**
```typescript
/**
 * Package Context
 *
 * Manages working directory and path resolution.
 * Allows package to work in any project structure.
 */

export interface PackageContext {
  /** Project root directory (where tokensrc.json lives) */
  rootDir: string;

  /** Data directory for baselines/reports (.figma/ by default) */
  dataDir: string;

  /** Config file path (tokensrc.json by default) */
  configPath: string;
}

let _context: PackageContext | null = null;

/**
 * Initialize package context
 * Must be called before using any functions
 */
export function initContext(options?: Partial<PackageContext>): PackageContext {
  const rootDir = options?.rootDir || process.cwd();

  _context = {
    rootDir,
    dataDir: options?.dataDir || `${rootDir}/.figma`,
    configPath: options?.configPath || `${rootDir}/tokensrc.json`,
  };

  return _context;
}

/**
 * Get current context (auto-initializes if needed)
 */
export function getContext(): PackageContext {
  if (!_context) {
    _context = initContext();
  }
  return _context;
}

/**
 * Resolve path relative to project root
 */
export function resolvePath(...segments: string[]): string {
  const ctx = getContext();
  return path.resolve(ctx.rootDir, ...segments);
}
```

#### Step 2: Refactor paths.ts

**Updated: `src/core/files/paths.ts`**
```typescript
import { getContext, resolvePath } from '../context';

/**
 * Get data directory path (where baselines/reports live)
 * Default: .figma/ in project root
 */
export function getDataDir(): string {
  return getContext().dataDir;
}

/**
 * Get config file path
 * Default: tokensrc.json in project root
 */
export function getConfigPath(): string {
  return getContext().configPath;
}

/**
 * Get baseline file path
 */
export function getBaselinePath(): string {
  return resolvePath(getDataDir(), 'data', 'baseline.json');
}

/**
 * Get previous baseline file path
 */
export function getBaselinePrevPath(): string {
  return resolvePath(getDataDir(), 'data', 'baseline.prev.json');
}

/**
 * Get diff report file path
 */
export function getDiffReportPath(): string {
  return resolvePath(getDataDir(), 'reports', 'diff-report.md');
}

// ... convert all constants to functions
```

**Migration Impact:**
- **Before:** `import { BASELINE_FILE } from './paths'`
- **After:** `import { getBaselinePath } from './paths'`
- **Files affected:** ~25 files
- **Effort:** 2-3 hours (find/replace with validation)

---

### Phase 1B: Configuration System (Week 1-2)

#### Step 3: Enhanced tokensrc.json Schema

**New structure (backwards compatible):**

```json
{
  "version": "2.0.0",

  "figma": {
    "fileId": "ABC123",
    "nodeId": "1:2",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },

  "paths": {
    "root": ".",
    "data": "./.figma",
    "baseline": "./.figma/data/baseline.json",
    "baselinePrev": "./.figma/data/baseline.prev.json",
    "reports": "./.figma/reports",
    "tokens": "./tokens",
    "styles": "./styles/tokens"
  },

  "collections": {
    "primitives": {
      "strategy": "byGroup",
      "output": "./tokens/primitives",
      "files": {
        "colors": "./tokens/primitives/colors.json",
        "typography": "./tokens/primitives/typography.json"
      }
    }
  },

  "build": {
    "command": "npm run tokens:build",
    "styleDictionary": {
      "enabled": true,
      "config": "./style-dictionary.config.js"
    }
  },

  "migration": {
    "enabled": true,
    "platforms": ["css", "scss", "js", "ts"],
    "exclude": ["node_modules/**", "dist/**"]
  }
}
```

**Key Changes:**
- ✅ All paths configurable (no hard-coded defaults)
- ✅ Environment variable interpolation (`${VAR_NAME}`)
- ✅ Relative paths resolved from config location
- ✅ Build command customizable (not just Style Dictionary)

#### Step 4: Config Loader with Defaults

**Updated: `src/core/files/loader.ts`**
```typescript
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { getContext } from '../context';

export interface LoadConfigOptions {
  /** Config file path (default: tokensrc.json in cwd) */
  configPath?: string;

  /** Require config file to exist (default: false) */
  required?: boolean;
}

/**
 * Load config with smart defaults
 */
export function loadConfig(options: LoadConfigOptions = {}): TokensConfig {
  const ctx = getContext();
  const configPath = options.configPath || ctx.configPath;

  if (!existsSync(configPath)) {
    if (options.required) {
      throw new Error(`Config not found: ${configPath}\nRun 'clarity-sync init' to create one.`);
    }
    return getDefaultConfig(dirname(configPath));
  }

  const raw = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw);

  // Resolve relative paths from config directory
  const configDir = dirname(configPath);
  config.paths = resolvePaths(config.paths || {}, configDir);

  // Interpolate environment variables
  config.figma = interpolateEnv(config.figma || {});

  return mergeWithDefaults(config, configDir);
}

/**
 * Get default config for a directory
 */
function getDefaultConfig(rootDir: string): TokensConfig {
  return {
    version: '2.0.0',
    figma: {
      fileId: '',
      nodeId: '',
      accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
    },
    paths: {
      root: rootDir,
      data: resolve(rootDir, '.figma'),
      baseline: resolve(rootDir, '.figma/data/baseline.json'),
      baselinePrev: resolve(rootDir, '.figma/data/baseline.prev.json'),
      reports: resolve(rootDir, '.figma/reports'),
      tokens: resolve(rootDir, 'tokens'),
      styles: resolve(rootDir, 'styles/tokens'),
    },
    collections: {},
    build: {
      command: '',
      styleDictionary: { enabled: false },
    },
    migration: {
      enabled: false,
      platforms: [],
      exclude: ['node_modules/**'],
    },
  };
}

/**
 * Interpolate environment variables in config
 * Example: "${FIGMA_ACCESS_TOKEN}" → actual value
 */
function interpolateEnv(obj: any): any {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const varName = value.slice(2, -1);
      result[key] = process.env[varName] || '';
    }
  }
  return result;
}

/**
 * Resolve relative paths to absolute
 */
function resolvePaths(paths: any, baseDir: string): any {
  const result = { ...paths };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && !path.isAbsolute(value)) {
      result[key] = resolve(baseDir, value);
    }
  }
  return result;
}
```

---

### Phase 1C: Environment Variable Handling (Week 2)

#### Current Problem

**From [lib/figma/constants.ts:13-25](figma-sync/lib/figma/constants.ts#L13-L25):**
```typescript
import { config } from 'dotenv';

// Load environment variables in priority order
config(); // .env
config({ path: '.env.local' }); // .env.local
const packageEnvPath = 'figma-sync/.figma/.env';
if (existsSync(packageEnvPath)) {
  config({ path: packageEnvPath, override: true });
}
```

**Issues:**
- ❌ Hard-coded path `figma-sync/.figma/.env`
- ❌ Loads at module import time (side effect)
- ❌ Can't be customized

#### Solution: Lazy Loading

**New: `src/core/env.ts`**
```typescript
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { getContext } from './context';

let _envLoaded = false;

/**
 * Load environment variables with smart defaults
 * Safe to call multiple times (only loads once)
 */
export function loadEnv(options?: { envPath?: string }): void {
  if (_envLoaded) return;

  // 1. Load .env from project root
  loadDotenv();

  // 2. Load .env.local (overrides .env)
  loadDotenv({ path: '.env.local' });

  // 3. Load package-specific .env if exists
  const ctx = getContext();
  const packageEnvPath = options?.envPath || `${ctx.dataDir}/.env`;
  if (existsSync(packageEnvPath)) {
    loadDotenv({ path: packageEnvPath, override: true });
  }

  _envLoaded = true;
}

/**
 * Get Figma access token from environment
 */
export function getFigmaToken(): string | undefined {
  loadEnv(); // Auto-load if not already loaded
  return process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;
}
```

**Updated: `src/core/figma/api.ts`**
```typescript
import { getFigmaToken } from '../env';

export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const accessToken = options?.accessToken || getFigmaToken();

  if (!accessToken) {
    throw new Error(
      'Figma access token not found.\n' +
      'Set FIGMA_ACCESS_TOKEN in .env or pass accessToken option.'
    );
  }

  // ... rest of logic
}
```

---

### Phase 1D: CLI System (Week 2)

#### Current State: Basic Readline

**From [lib/cli/prompt.ts](figma-sync/lib/cli/prompt.ts):**
- Uses Node.js `readline` (basic)
- No colors, no spinners, no progress
- Works but not user-friendly

#### Upgrade: Modern CLI Experience

**Dependencies to add:**
```json
{
  "commander": "^12.0.0",      // CLI framework
  "inquirer": "^9.0.0",        // Interactive prompts
  "chalk": "^5.0.0",           // Colors
  "ora": "^8.0.0",             // Spinners
  "cli-table3": "^0.6.0",      // Tables
  "boxen": "^7.0.0"            // Boxes
}
```

**New: `src/cli/index.ts`** (main entry point)
```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { syncCommand } from './commands/sync';
import { diffCommand } from './commands/diff';
import { rollbackCommand } from './commands/rollback';

const program = new Command();

program
  .name('clarity-sync')
  .description('Sync Figma design tokens to code')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize token sync configuration')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-t, --template <name>', 'Use a template (nextjs, tailwind, css)')
  .action(initCommand);

program
  .command('sync')
  .description('Fetch tokens from Figma and update local files')
  .option('--no-backup', 'Skip creating backup')
  .option('--no-build', 'Skip running build command')
  .option('--dry-run', 'Show what would change without applying')
  .action(syncCommand);

program
  .command('diff')
  .description('Compare Figma tokens with local baseline')
  .option('--local', 'Compare with local files instead of Figma')
  .option('--format <type>', 'Output format (table, json, markdown)', 'table')
  .action(diffCommand);

program
  .command('rollback')
  .description('Restore previous baseline')
  .option('--force', 'Skip confirmation')
  .action(rollbackCommand);

program.parse();
```

**New: `src/cli/commands/init.ts`**
```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { initContext } from '../../core/context';
import { fetchFigmaData } from '../../core/figma';
import { saveConfig, ensureDir } from '../../core/files';

export async function initCommand(options: any) {
  console.log(
    boxen(
      chalk.bold.cyan('Synkio Token Sync') + '\n' +
      'Initialize Figma token sync for your project',
      { padding: 1, margin: 1, borderStyle: 'round' }
    )
  );

  // Initialize context
  initContext({ rootDir: process.cwd() });

  // Prompt for Figma credentials
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'fileUrl',
      message: 'Figma file URL:',
      validate: (input) => input.includes('figma.com/') || 'Invalid Figma URL',
    },
    {
      type: 'password',
      name: 'accessToken',
      message: 'Figma access token:',
      validate: (input) => input.length > 0 || 'Token required',
    },
    {
      type: 'input',
      name: 'nodeId',
      message: 'Registry node ID (optional, press Enter to skip):',
    },
  ]);

  // Connect to Figma
  const spinner = ora('Connecting to Figma...').start();

  try {
    const data = await fetchFigmaData({
      fileUrl: answers.fileUrl,
      accessToken: answers.accessToken,
      nodeId: answers.nodeId || undefined,
    });

    spinner.succeed(chalk.green('Connected to Figma!'));

    // Extract collections
    const collections = extractCollections(data);
    console.log(chalk.cyan(`\nFound ${collections.length} collections:`));
    collections.forEach(c => console.log(`  • ${c.name} (${c.modes.length} modes)`));

    // Ask about collection mapping...
    // Ask about build configuration...
    // Generate config file...

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to connect'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
```

---

### Phase 1E: Programmatic API (Week 3)

#### Goal: Enable Next.js/Remix/etc. to use the package

**New: `src/api/index.ts`**
```typescript
/**
 * Programmatic API
 *
 * Use these functions in Next.js API routes, Remix loaders, etc.
 */

import { initContext } from '../core/context';
import type { PackageContext } from '../core/context';

export { fetchFigmaData } from '../core/figma';
export { compareBaselines } from '../core/compare';
export { applyMigrations, scanForTokenUsage } from '../core/tokens/migrate';
export { splitTokens } from '../core/tokens';
export type * from '../core/types';

/**
 * Initialize the package for programmatic use
 *
 * @example
 * ```typescript
 * // app/api/token-sync/route.ts
 * import { init, fetchFigmaData } from '@synkio/sync/api';
 *
 * init({ rootDir: process.cwd() });
 * const data = await fetchFigmaData({ fileUrl, accessToken });
 * ```
 */
export function init(context?: Partial<PackageContext>): void {
  initContext(context);
}
```

**Usage in Next.js:**
```typescript
// app/api/token-sync/connect/route.ts
import { init, fetchFigmaData } from '@synkio/sync/api';

// Initialize once per API route
init({ rootDir: process.cwd() });

export async function POST(request: Request) {
  const { fileUrl, accessToken } = await request.json();

  try {
    const data = await fetchFigmaData({ fileUrl, accessToken });
    return Response.json({ success: true, data });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

### Phase 1F: Package Build & Publishing (Week 3-4)

#### Build Configuration

**package.json:**
```json
{
  "name": "@synkio/sync",
  "version": "0.1.0",
  "description": "Sync Figma design tokens to code",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "clarity-sync": "./dist/cli/index.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./api": {
      "types": "./dist/api/index.d.ts",
      "import": "./dist/api/index.js"
    },
    "./core/*": {
      "types": "./dist/core/*.d.ts",
      "import": "./dist/core/*.js"
    }
  },
  "files": [
    "dist",
    "templates",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc && chmod +x dist/cli/index.js",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build && npm test",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0",
    "cli-table3": "^0.6.0",
    "boxen": "^7.0.0",
    "dotenv": "^17.0.0",
    "glob": "^11.0.0",
    "style-dictionary": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  },
  "keywords": [
    "figma",
    "design-tokens",
    "design-system",
    "css-variables",
    "tailwind",
    "style-dictionary"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/clarity-tokens-sync.git"
  },
  "license": "MIT"
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Directory Structure

```
@synkio/sync/
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── sync.ts
│   │   │   ├── diff.ts
│   │   │   └── rollback.ts
│   │   └── index.ts (#!/usr/bin/env node)
│   │
│   ├── api/
│   │   └── index.ts (public programmatic API)
│   │
│   ├── core/ (moved from lib/)
│   │   ├── context.ts (NEW - path resolution)
│   │   ├── env.ts (NEW - environment loading)
│   │   ├── figma/
│   │   ├── tokens/
│   │   ├── compare/
│   │   ├── files/
│   │   ├── detect/
│   │   ├── adapters/
│   │   └── types/
│   │
│   └── index.ts (re-exports for library usage)
│
├── templates/ (config templates)
│   ├── nextjs.tokensrc.json
│   ├── tailwind.tokensrc.json
│   └── css.tokensrc.json
│
├── dist/ (compiled output)
│   ├── cli/
│   ├── api/
│   ├── core/
│   └── index.js
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## Migration Path for Synkio

### Step 1: Publish Package to NPM

```bash
cd /path/to/new/repo
npm publish --access public --tag beta
```

### Step 2: Update Synkio's package.json

```json
{
  "dependencies": {
-   "figma-sync": "file:./figma-sync"
+   "@synkio/sync": "^0.1.0-beta.1"
  },
  "scripts": {
-   "figma:setup": "npx tsx figma-sync/bin/setup.ts",
-   "figma:sync": "npx tsx figma-sync/bin/sync.ts",
+   "figma:setup": "clarity-sync init",
+   "figma:sync": "clarity-sync sync",
  }
}
```

### Step 3: Move Config File

```bash
# Move config from figma-sync/.figma/ to root
mv figma-sync/.figma/config/tokensrc.json ./tokensrc.json

# Update paths in tokensrc.json
# Change all "figma-sync/.figma" → ".figma"
```

### Step 4: Update API Routes

**Before:**
```typescript
import { fetchFigmaData } from '@/figma-sync/lib/figma/api';
```

**After:**
```typescript
import { init, fetchFigmaData } from '@synkio/sync/api';

init({ rootDir: process.cwd() });
```

### Step 5: Test & Remove Old Directory

```bash
npm run figma:sync  # Test new package
rm -rf figma-sync/  # Remove old directory (after backup!)
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Test file: `src/core/context.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initContext, getContext, resolvePath } from './context';

describe('Package Context', () => {
  beforeEach(() => {
    // Reset context between tests
    initContext({ rootDir: '/test/project' });
  });

  it('should initialize with default paths', () => {
    const ctx = getContext();
    expect(ctx.rootDir).toBe('/test/project');
    expect(ctx.dataDir).toBe('/test/project/.figma');
  });

  it('should resolve paths relative to root', () => {
    const path = resolvePath('tokens', 'primitives.json');
    expect(path).toBe('/test/project/tokens/primitives.json');
  });
});
```

### Integration Tests

**Test against real Figma file:**
```typescript
describe('Figma Integration', () => {
  it('should fetch data from public Figma file', async () => {
    const data = await fetchFigmaData({
      fileUrl: 'https://figma.com/file/TEST123',
      accessToken: process.env.TEST_FIGMA_TOKEN,
    });

    expect(data).toBeDefined();
    expect(data.primitives).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] CLI: `npx @synkio/sync init` works in blank Next.js project
- [ ] CLI: `npx @synkio/sync sync` fetches tokens
- [ ] API: Import works in Next.js API route
- [ ] API: Import works in Remix loader
- [ ] Config: Works with custom paths
- [ ] Config: Works with environment variables
- [ ] Migrations: Detects and replaces token references
- [ ] Build: Style Dictionary integration works

---

## Risk Assessment

### High Risk
1. **Breaking Synkio's current setup**
   - Mitigation: Test package in Synkio *before* removing figma-sync/
   - Rollback: Keep figma-sync/ as git backup until confirmed working

2. **NPM package name conflicts**
   - Mitigation: Check availability on npmjs.com first
   - Alternative names: `@figma-tokens/sync`, `figma-token-sync`, `design-tokens-sync`

### Medium Risk
1. **Path resolution bugs**
   - Mitigation: Extensive unit tests for context.ts
   - Test in 3+ different project structures

2. **Environment variable loading**
   - Mitigation: Document clear priority order
   - Add warning logs when multiple .env files exist

### Low Risk
1. **CLI dependency size**
   - Impact: ~15MB from inquirer + chalk + ora
   - Mitigation: Acceptable for dev dependency

---

## Timeline & Milestones

### Week 1: Foundations
- [x] Create new repo
- [ ] Extract lib/ → src/core/
- [ ] Implement context system
- [ ] Refactor all hard-coded paths
- [ ] Add unit tests for context

### Week 2: Configuration & CLI
- [ ] Enhance tokensrc.json schema
- [ ] Implement config loader with defaults
- [ ] Build CLI with commander + inquirer
- [ ] Add init command with templates
- [ ] Test CLI in 3 project types

### Week 3: API & Polish
- [ ] Create programmatic API (src/api/)
- [ ] Update all bin/ scripts to use new structure
- [ ] Write comprehensive README
- [ ] Add migration guide from old setup
- [ ] Integration tests

### Week 4: Publishing & Migration
- [ ] Publish to NPM (beta)
- [ ] Update Synkio to use package
- [ ] Test Synkio end-to-end
- [ ] Fix any issues
- [ ] Remove figma-sync/ directory
- [ ] Publish stable v0.1.0

---

## Success Criteria

### Technical
- ✅ Package installs in blank Next.js project
- ✅ CLI works without tokensrc.json (creates default)
- ✅ API works in Next.js/Remix/Vite
- ✅ All tests passing
- ✅ TypeScript types exported correctly

### User Experience
- ✅ `npx @synkio/sync init` completes in < 2 minutes
- ✅ Error messages are helpful (no stack traces)
- ✅ Progress indicators for long operations
- ✅ Works offline (after initial setup)

### Compatibility
- ✅ Works on macOS, Linux, Windows
- ✅ Node.js 18, 20, 22
- ✅ Next.js 14, 15, 16
- ✅ Works with pnpm, npm, yarn

---

## Open Questions

1. **Package naming:** `@synkio/sync` or something else?
   - Alternatives: `figma-token-sync`, `@design-tokens/figma`, `token-vault-sync`

2. **License:** MIT or dual-license (OSS core + commercial dashboard)?
   - Recommendation: Start with MIT, can always add commercial later

3. **Versioning:** Start at 0.1.0 or 1.0.0?
   - Recommendation: 0.1.0 (signals pre-1.0, breaking changes OK)

4. **Style Dictionary:** Required or optional dependency?
   - Current: Required
   - Better: Optional (allow custom build scripts)

5. **Monorepo:** Single package or split CLI/core?
   - Recommendation: Single package for Phase 1, can split later

---

## Next Steps

**Immediate (today):**
1. Create GitHub repo: `github.com/yourname/clarity-tokens-sync`
2. Copy figma-sync/ to new repo
3. Initialize with package.json + tsconfig.json
4. Commit as "Initial extraction from Synkio"

**This week:**
1. Implement context system (src/core/context.ts)
2. Refactor paths.ts to use context
3. Update 5-10 files as proof-of-concept
4. Run tests locally

**Ask me to proceed with any of these steps!**

---

**Questions? Need clarification on any section? Ready to start coding?**
