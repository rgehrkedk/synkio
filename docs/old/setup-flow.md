# Setup Flow Documentation

This document describes all possible paths and decision points in the `figma:setup` wizard.

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           START: npm run figma:setup                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  1. Check Existing      │
                        │     Config              │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  2. Project Detection   │
                        │     (auto-scan)         │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  3. Figma Connection    │
                        │     (token, fileId,     │
                        │      nodeId)            │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  4. Collection Output   │
                        │     Files (per-        │
                        │     collection config)  │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  5. Build Setup         │
                        │     (SD detection)      │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  6. Finalize            │
                        │     (split, build)      │
                        └─────────────────────────┘
```

---

## Step 1: Check Existing Config

**If config exists:**
```
Found existing config: figma-sync/.figma/config/tokensrc.json

Overwrite existing configuration? (y/N):
```
- **N (default)** → `Setup cancelled. Existing config preserved.` → EXIT
- **Y** → Continue

---

## Step 2: Project Detection

Automatic scanning of the project for existing setup.

```
Analyzing project...

Project Analysis:
────────────────────────────────────────
  ✓ Token directory: tokens/
  ✓ Styles directory: styles/tokens/
  ✓ Build command: npm run build:tokens
  ✓ Style Dictionary: scripts/build-tokens.js
    Version: v3
    Platforms: css
```

**Detection includes:**
- Token directories (searches for JSON files with token structure)
- Style directories (searches for CSS/SCSS output)
- Build scripts in package.json
- Style Dictionary config (by content analysis, not hardcoded paths)

---

## Step 3: Figma Connection

### 3a. Access Token

**If token found in environment:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Figma Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Figma access token found in environment.
```

**If token NOT found:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Figma Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No Figma access token found.
Get your token from: https://www.figma.com/developers/api#access-tokens

Enter Figma access token (or press Enter to skip):
```
- **Provided** → `Token saved to figma-sync/.figma/.env`
- **Empty** → Continue (will fail at connection test)

### 3b. File ID (Required)

```
You can find the file ID in the Figma URL:
https://www.figma.com/file/[FILE_ID]/...

Enter Figma file ID:
```
- **Provided** → Continue
- **Empty** → `File ID is required. Setup cancelled.` → EXIT

### 3c. Node ID (Optional)

```
The node ID comes from the "Token Vault" Figma plugin.
It identifies the registry node where tokens are exported.

Enter registry node ID:
```
- **Provided** → Uses direct node access (faster)
- **Empty** → Searches entire file (slower)

### 3d. Connection Test

```
Testing connection to Figma...
✓ Connection successful!

Saved baseline: figma-sync/.figma/data/baseline.json
```

**Failure:**
```
✗ Connection failed: Figma API error (404): {"status":404,"err":"Not found"}

Check your file ID and access token, then run setup again.
```
→ EXIT

### 3e. Collection Analysis

```
Detected collections:
  - primitives: 1 mode(s), ~156 tokens
  - brands: 8 mode(s), ~48 tokens
  - themes: 2 mode(s), ~89 tokens
```

---

## Step 4: Collection Output Files

For each collection, the wizard helps configure output file mappings.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Collection Output Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning codebase for existing token files...
```

### Per-Collection Configuration

**Multi-mode collections (automatic byMode strategy):**
```
brands (8 modes, ~48 tokens)

──────────────────────────────────────────────────
  Found 8 token file(s) in tokens/brands:
    • clarity.json
    • velocity.json
    • zenith.json
    • neon.json
    • bolt.json
    • chill.json
    • dunno.json
    • odd.json

  Current mapping:
  ✓ clarity → clarity.json (matched (high))
  ✓ velocity → velocity.json (matched (high))
  ✓ zenith → zenith.json (matched (high))
  ...

Action:
  1. Accept this mapping
  2. Map individual files
     Choose specific files for each mode/group
  3. Change directory
     Currently: tokens/brands
  4. Skip this collection

Select option (1-4) [1]:
```

**Single-mode collections (user chooses strategy):**
```
primitives (1 mode, 5 groups, ~156 tokens)

Output format:
  1. Single file
     All tokens in one file
  2. Split by group
     5 files (colors, spacing, radii...)
  3. Skip this collection

Select option (1-3) [1]:
```

### File Mapping Actions

**Accept mapping:** Uses auto-detected or suggested file paths

**Map individual files:** Configure each mode/group to a specific file
```
  Mapping: clarity

Select file for "clarity":
  1. Keep current: clarity.json
     file exists
  2. clarity.json
     existing token file
  3. velocity.json
     existing token file
  4. Enter custom path...
  5. Create new: clarity.json

Select option (1-5) [1]:
```

**Change directory:** Scan a different directory for files
```
Enter directory path (tokens/brands):
```

---

## Step 5: Build Setup

### Build command detected
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detected build command: npm run build:tokens
Use this command after sync? (Y/n):
```

### Style Dictionary found, no build script
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style Dictionary config found: scripts/build-tokens.js
But no build script detected in package.json.

Add "tokens:build" script to package.json? (Y/n):
```
- **Y** → `Added script: "tokens:build"`

### No Style Dictionary
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No Style Dictionary setup detected.
Style Dictionary transforms token JSON into CSS/SCSS/etc.

How do you want to handle token transformation?

  1. Skip build step
     Just sync JSON files, no CSS generation

  2. Enter custom build command
     Use your own script

  3. Set up Style Dictionary (recommended)
     Create basic config for CSS output

Select option (1-3) [3]:
```

**Option 3 (Scaffold):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build Output
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detected styles directory: styles/tokens
Use this for generated CSS? (Y/n):

Setting up Style Dictionary...
Created: style-dictionary.config.mjs
Added script: "tokens:build"
```

---

## Step 6: Finalize

```
Saved config: figma-sync/.figma/config/tokensrc.json

Splitting tokens...

Tokens split: 13 files, 293 tokens

Running build: npm run tokens:build
[Style Dictionary build output]

════════════════════════════════════════════════════════════
  Setup Complete!
════════════════════════════════════════════════════════════

Files created:
  - figma-sync/.figma/config/tokensrc.json (configuration)
  - figma-sync/.figma/data/baseline.json (Figma data)
  - tokens/*/*.json (token files)
  - styles/tokens/*.css (CSS variables)

Next steps:
  1. Review figma-sync/.figma/config/tokensrc.json
  2. Run "npm run figma:sync" to sync changes from Figma
  3. Run "npm run figma:diff" to preview changes without syncing
```

---

## Error Messages

| Situation | Message |
|-----------|---------|
| Config exists, user declines | `Setup cancelled. Existing config preserved.` |
| Empty file ID | `File ID is required. Setup cancelled.` |
| API 404 error | `✗ Connection failed: Figma API error (404): {"status":404,"err":"Not found"}` |
| No plugin data | `✗ Connection failed: No plugin data found. Run "Sync" in Token Vault plugin first.` |
| Token not found | `✗ Connection failed: FIGMA_ACCESS_TOKEN not found...` |
| Build fails | `Warning: Build failed. Run "npm run tokens:build" manually.` |

---

## Environment Variables

Loaded in priority order (later overrides earlier):

| Priority | Location | Description |
|----------|----------|-------------|
| 1 (lowest) | `.env` | Project root |
| 2 | `.env.local` | Project root (gitignored) |
| 3 (highest) | `figma-sync/.figma/.env` | Package-local (gitignored) |

| Variable | Description |
|----------|-------------|
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token |
| `FIGMA_TOKEN` | Alternative name (fallback) |

---

## Detection Heuristics

### Style Dictionary Detection

The wizard detects SD config files by **content analysis**, not hardcoded paths:

**Directories scanned:**
- `.` (root)
- `scripts/`
- `tokens/`
- `config/`
- `src/`
- `build/`

**Content patterns checked:**
- `StyleDictionary`
- `style-dictionary`
- `platforms:\s*\{`
- `transformGroup:`
- `buildPath:`

A file must match **at least 2 patterns** to be considered an SD config.

**Version detection:**
- v3: Contains `StyleDictionary.extend` or `module.exports`
- v4: Contains `export default` or `defineConfig`

### Collection Strategy

Strategy is **automatically determined**:

| Condition | Strategy |
|-----------|----------|
| Multiple modes | `byMode` (one file per mode) |
| Single mode | User chooses: `single`, `byGroup`, or skip |

### File Matching

The wizard matches Figma modes/groups to existing files using:

**Segmented filename matching:**
Files like `brand.nykredit.tokens.json` are parsed into segments:
- `brand`, `nykredit`, `tokens`
- Matches if any segment equals the mode/group name

**Confidence levels:**

| Score | Confidence | Criteria |
|-------|------------|----------|
| 1.0 | High | Exact name match |
| 0.95 | High | Name is a segment of filename |
| 0.85 | High | Segment contains name |
| 0.7 | Medium | Related variation |
| < 0.5 | None | No match |

### Token File Detection

**Directories scanned:** Up to 10 levels deep

**Ignored directories:**
- `node_modules`, `.git`, `dist`, `build`, `.next`, `.figma`, `coverage`, `.cache`, `.turbo`
- Directories containing: `backup`, `.backup`, `deprecated`

**Token file criteria:**
JSON files containing `"value"`, `"$value"`, `"type"`, or `"$type"` keys

---

## Configuration Output

The setup creates `figma-sync/.figma/config/tokensrc.json`:

```json
{
  "$schema": "./schemas/tokensrc.schema.json",
  "version": "1.0.0",
  "figma": {
    "fileId": "hZ3LM5yeVUtSO6MDhjxtfw",
    "nodeId": "39:58",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },
  "paths": {
    "data": "figma-sync/.figma/data",
    "baseline": "figma-sync/.figma/data/baseline.json",
    "baselinePrev": "figma-sync/.figma/data/baseline.prev.json",
    "reports": "figma-sync/.figma/reports",
    "tokens": "tokens",
    "styles": "styles/tokens"
  },
  "split": {
    "primitives": {
      "collection": "primitives",
      "strategy": "byGroup",
      "output": "tokens/primitives",
      "files": {
        "colors": "tokens/primitives/colors.json",
        "spacing": "tokens/primitives/spacing.json"
      }
    },
    "brands": {
      "collection": "brands",
      "strategy": "byMode",
      "output": "tokens/brands",
      "files": {
        "clarity": "tokens/brands/clarity.json",
        "velocity": "tokens/brands/velocity.json"
      }
    }
  },
  "build": {
    "command": "npm run build:tokens",
    "styleDictionary": {
      "configPath": "scripts/build-tokens.js",
      "version": "v3"
    }
  },
  "migration": {
    "autoApply": false,
    "platforms": {
      "css": {
        "enabled": true,
        "include": ["**/*.css", "**/*.module.css"],
        "exclude": ["node_modules/**"],
        "transform": {
          "prefix": "--",
          "separator": "-",
          "case": "kebab",
          "stripSegments": ["primitives", "brands", "themes", "value", "light", "dark"]
        },
        "patterns": ["var\\(--{token}\\)"]
      }
    }
  }
}
```

Key features:
- **`files` mapping**: Explicit file paths for each mode/group (supports any naming convention)
- **`styleDictionary.configPath`**: Saved SD config path for reliable reference
- **Dynamic `stripSegments`**: Generated from collection and mode names

---

## Post-Setup: Sync and Diff Commands

After setup, use `figma:sync` and `figma:diff` to manage token updates.

### figma:sync Flow

When breaking changes are detected:

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  BREAKING CHANGES DETECTED
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

Additions: 2
Removals: 1
Path Changes: 3 (breaking)

Scanning 1 platform(s) for impact...
  Platforms: css

Css: 12 usage(s) in 4 file(s)
  - components/Button/Button.module.css (3)
  - components/Card/Card.module.css (4)
  - styles/global.css (5)

How do you want to proceed?

  1. Apply all changes
     Update tokens + auto-migrate affected files

  2. Tokens only
     Update tokens, generate migration report for manual updates

  3. Report only
     Generate migration report without applying any changes

  4. Abort
     Cancel sync, no changes made

Select option (1-4) [1]:
```

**Option 1 (Apply all):**
```
Splitting tokens...
  13 files written

Applying migrations...

Css:
  ✓ components/Button/Button.module.css (3 replacements)
  ✓ components/Card/Card.module.css (4 replacements)
  ✓ styles/global.css (5 replacements)

✓ Migrated 12 token reference(s) in 3 file(s)

Building CSS...

✓ Applied 6 token change(s) (3 breaking)
```

**Option 2 (Tokens only):**
```
Migration report saved: figma-sync/.figma/reports/migration-report.md

Splitting tokens...
  13 files written

Review the migration report and update affected files manually.

Building CSS...

✓ Applied 6 token change(s) (3 breaking)
```

**Option 3 (Report only):**
```
Migration report saved: figma-sync/.figma/reports/migration-report.md
No token changes applied. Review the migration report.
```

### figma:diff Flow

When breaking changes are detected with file usages:

```
How do you want to proceed?

  1. Skip
     Just view the report, no changes

  2. Dry run
     Preview what would be changed

  3. Apply migrations
     Update affected files now

Select option (1-3) [1]:
```

**Dry run output:**
```
Dry run - showing what would be changed:

Css:
  [DRY RUN] components/Button/Button.module.css (3 replacements)
  [DRY RUN] components/Card/Card.module.css (4 replacements)

Would migrate 7 token reference(s) in 2 file(s)
```

**Apply output:**
```
Applying migrations...

Css:
  ✓ components/Button/Button.module.css (3 replacements)
  ✓ components/Card/Card.module.css (4 replacements)

✓ Migrated 7 token reference(s) in 2 file(s)
```

### Command Line Flags

```bash
# Diff commands
npm run figma:diff             # Interactive mode
npm run figma:diff --local     # Compare baselines only (no Figma fetch)
npm run figma:diff --apply     # Apply migrations non-interactively
npm run figma:diff --dry-run   # Preview migrations

# Combined flags
npm run figma:diff --apply --dry-run   # Non-interactive dry run
```
