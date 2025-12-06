# @synkio/core

> **Framework-agnostic Figma design token synchronization for modern web projects**

Sync Figma Variables to your codebase with zero configuration. Works with Next.js, Remix, Vite, or any Node.js project.

## Features

- 🚀 **Zero Config** - Get started with `npx synkio init`
- 🎨 **Figma Variables** - Full support for Figma's Variables API
- 🔄 **Auto Sync** - Keep tokens in sync with your Figma file
- 📦 **Framework Agnostic** - Works with any JavaScript framework
- 🛠️ **CLI + API** - Use from command line or programmatically
- 🔍 **Diff Detection** - See exactly what changed between syncs
- ⏪ **Rollback Support** - Restore previous versions safely
- 🎯 **TypeScript First** - Full type safety and autocomplete

## Installation

```bash
npm install @synkio/core
# or
yarn add @synkio/core
# or
pnpm add @synkio/core
```

## Quick Start

### 1. Initialize Configuration

```bash
npx synkio init
```

This will:
- Prompt for your Figma file URL
- Prompt for your Figma access token
- Connect and validate your Figma file
- Generate a `tokensrc.json` configuration file

### 2. Sync Tokens

```bash
npx synkio sync
```

This will:
- Fetch design tokens from Figma
- Generate token files in your project
- Create a baseline for change tracking

## CLI Commands

### `synkio init`

Interactive setup wizard to configure Synkio.

```bash
# Interactive mode
npx synkio init

# Use a template
npx synkio init --template nextjs

# Non-interactive mode (requires env vars)
npx synkio init --yes
```

**Options:**
- `--template <name>` - Use a template: `nextjs`, `tailwind`, or `css`
- `--yes, -y` - Skip prompts and use defaults

**Templates:**
- `nextjs` - Optimized for Next.js with CSS Variables
- `tailwind` - Configured for Tailwind CSS integration
- `css` - Plain CSS custom properties

### `synkio sync`

Fetch and apply tokens from Figma.

```bash
# Normal sync
npx synkio sync

# Preview changes without applying
npx synkio sync --dry-run

# Skip backup creation
npx synkio sync --no-backup

# Skip build command
npx synkio sync --no-build
```

**Options:**
- `--dry-run` - Show changes without applying them
- `--no-backup` - Skip creating backup of previous baseline
- `--no-build` - Skip running build command from config

### `synkio diff`

Compare Figma tokens with local baseline.

```bash
# Compare with Figma
npx synkio diff

# Compare local files
npx synkio diff --local

# Output as JSON
npx synkio diff --format json
```

**Options:**
- `--local` - Compare current baseline with previous backup
- `--format <type>` - Output format: `table` (default) or `json`

### `synkio rollback`

Restore previous baseline.

```bash
# Interactive rollback
npx synkio rollback

# Force rollback without confirmation
npx synkio rollback --force
```

**Options:**
- `--force, -f` - Skip confirmation prompt

## Programmatic API

Use Synkio programmatically in your build scripts, API routes, or custom workflows.

### Next.js API Route

```typescript
// app/api/tokens/route.ts
import { init, fetchFigmaData, splitTokens, loadConfig } from '@synkio/core/api';
import { NextResponse } from 'next/server';

export async function POST() {
  // Initialize context
  init({ rootDir: process.cwd() });

  // Fetch tokens from Figma
  const data = await fetchFigmaData({
    fileId: process.env.FIGMA_FILE_ID!,
  });

  // Process and save tokens
  const config = loadConfig()!;
  const result = await splitTokens(data, config);

  return NextResponse.json({
    success: true,
    filesWritten: result.filesWritten
  });
}
```

### Remix Loader

```typescript
// app/routes/admin.tokens.tsx
import { init, fetchFigmaData } from '@synkio/core/api';
import { json } from '@remix-run/node';

export async function loader() {
  init({ rootDir: process.cwd() });

  const data = await fetchFigmaData({
    fileId: process.env.FIGMA_FILE_ID!,
  });

  return json({
    collections: data.collections,
    lastUpdated: data.$metadata.exportedAt
  });
}
```

### Custom Build Script

```typescript
// scripts/sync-tokens.ts
import {
  init,
  fetchFigmaData,
  compareBaselines,
  splitTokens,
  loadConfig,
  loadBaseline
} from '@synkio/core/api';

async function syncTokens() {
  // Initialize
  init({ rootDir: process.cwd() });

  // Load config
  const config = loadConfig();
  if (!config) {
    throw new Error('Config not found. Run synkio init first.');
  }

  // Fetch from Figma
  console.log('Fetching tokens from Figma...');
  const data = await fetchFigmaData({
    fileId: config.figma.fileId
  });

  // Compare with previous baseline
  const previousData = loadBaseline();
  if (previousData) {
    const comparison = compareBaselines(previousData, data);
    if (comparison.breakingChanges.length > 0) {
      console.warn('⚠️  Breaking changes detected!');
    }
  }

  // Generate token files
  await splitTokens(data, config);
  console.log('✅ Tokens synced successfully!');
}

syncTokens().catch(console.error);
```

### Monorepo Support

Synkio supports multiple isolated contexts for monorepo setups:

```typescript
import { createContext, fetchFigmaData } from '@synkio/core/api';

// Package A
const ctxA = createContext({ rootDir: '/monorepo/packages/app-a' });
const dataA = await fetchFigmaData({ fileId: 'fileA' });

// Package B (completely independent)
const ctxB = createContext({ rootDir: '/monorepo/packages/app-b' });
const dataB = await fetchFigmaData({ fileId: 'fileB' });
```

## Configuration

The `tokensrc.json` file controls how Synkio syncs and processes tokens.

### Example Configuration

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "abc123xyz",
    "nodeId": "123:456",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },
  "paths": {
    "root": ".",
    "data": ".synkio/data",
    "baseline": ".synkio/data/baseline.json",
    "baselinePrev": ".synkio/data/baseline.prev.json",
    "reports": ".synkio/reports",
    "tokens": "tokens",
    "styles": "styles"
  },
  "collections": {
    "core": {
      "strategy": "byMode",
      "output": "tokens/core",
      "files": {
        "light": "tokens/core/light.json",
        "dark": "tokens/core/dark.json"
      }
    }
  },
  "build": {
    "command": "npm run build:tokens"
  }
}
```

### Configuration Schema

#### `figma`
- `fileId` (required) - Figma file ID from URL
- `nodeId` (optional) - Specific node to fetch from
- `accessToken` (required) - Figma personal access token (supports `${ENV_VAR}` interpolation)

#### `paths`
- `root` - Project root directory
- `data` - Where Synkio stores internal data
- `baseline` - Current baseline snapshot
- `baselinePrev` - Previous baseline (for rollback)
- `reports` - Diff and migration reports
- `tokens` - Generated token files
- `styles` - Generated style files

#### `collections`
Configuration for each Figma collection:
- `strategy` - How to split tokens: `byMode`, `byGroup`, or `flat`
- `output` - Output directory for this collection
- `files` - Custom file mapping (optional)

#### `build`
- `command` - Build command to run after sync (optional)

### Environment Variables

Synkio supports environment variable interpolation in `tokensrc.json`:

```json
{
  "figma": {
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  }
}
```

Create a `.env` file:
```env
FIGMA_ACCESS_TOKEN=your-token-here
```

## Migration from figma-sync/

If you're upgrading from the old `figma-sync/` structure:

1. **Install the package:**
   ```bash
   npm install @synkio/core
   ```

2. **Run init:**
   ```bash
   npx synkio init
   ```

3. **Update paths in tokensrc.json:**
   - Old: `figma-sync/baseline.json`
   - New: `.synkio/data/baseline.json`

4. **Update imports:**
   ```typescript
   // Old
   import { fetchFigmaData } from './figma-sync/lib/figma';

   // New
   import { fetchFigmaData } from '@synkio/core/api';
   ```

## Troubleshooting

### TypeScript Errors

If you see module resolution errors:

```typescript
// Make sure to use the /api export
import { init } from '@synkio/core/api';  // ✅ Correct
import { init } from '@synkio/core';      // ❌ Wrong
```

### VSCode Autocomplete

Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### ESM Module Errors

Ensure your `package.json` has:
```json
{
  "type": "module"
}
```

### Missing Figma Token

1. Go to https://www.figma.com/settings
2. Create a personal access token
3. Add to `.env`:
   ```env
   FIGMA_ACCESS_TOKEN=your-token-here
   ```

### Permission Denied on CLI

Make sure the binary is executable:
```bash
chmod +x node_modules/@synkio/core/dist/cli/bin.js
```

## API Reference

### Core Functions

- `init(options)` - Initialize context
- `getContext()` - Get current context
- `createContext(options)` - Create isolated context

### Figma API

- `fetchFigmaData({ fileId, nodeId })` - Fetch tokens from Figma
- `getFigmaToken()` - Get Figma access token from environment

### File Operations

- `loadConfig(ctx?)` - Load configuration file
- `saveConfig(config, path?, ctx?)` - Save configuration
- `loadBaseline(ctx?)` - Load current baseline
- `backupBaseline(ctx?)` - Create backup of baseline
- `restoreBaseline(ctx?)` - Restore from backup

### Comparison

- `compareBaselines(old, new)` - Compare two baselines
- `hasChanges(comparison)` - Check if changes exist
- `hasBreakingChanges(comparison)` - Check for breaking changes
- `getChangeCounts(comparison)` - Get change statistics
- `generateDiffReport(comparison)` - Generate markdown report

### Token Processing

- `splitTokens(data, config)` - Process and save token files

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

MIT © [Synkio](https://github.com/rgehrkedk/synkio)

## Links

- [GitHub Repository](https://github.com/rgehrkedk/synkio)
- [Documentation](https://github.com/rgehrkedk/synkio/tree/main/docs)
- [Roadmap](https://github.com/rgehrkedk/synkio/blob/main/docs/ROADMAP.md)
- [Issue Tracker](https://github.com/rgehrkedk/synkio/issues)
