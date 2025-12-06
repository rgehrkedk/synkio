# Spec Requirements: Enhance Init Command Config Generation

## Initial Description

Enhance `packages/core/src/cli/commands/init.ts` to generate complete tokensrc.json configuration by porting logic from setup.ts.

**Key Requirements:**
1. Collection Configuration: After fetching Figma data, analyze collections and prompt user for split strategy (byMode, byGroup, or flat), output directory path, and file paths for each mode/group
2. Style Dictionary Detection: Auto-detect Style Dictionary and populate build.styleDictionary section
3. Schema Reference: Add "$schema" reference to generated config
4. **Migration Configuration (OPTIONAL):** Prompt to configure automatic migration for breaking token changes
5. Code Cleanup: Remove all [DEBUG] console.log statements and unused imports

**Context:**
This is part of the Synkio project, a tool for syncing Figma design tokens to code. The init command currently creates a simplified tokensrc.json, but needs to be enhanced to generate complete configuration like the setup command does.

**Reference Files:**
- Source: `packages/core/src/cli/commands/setup.ts` (lines 68-400+ for base setup, lines 400-600+ for migration)
- Target: `packages/core/src/cli/commands/init.ts`
- Helpers: `packages/core/src/tokens/split.ts`, `packages/core/src/detect/index.ts`, `packages/core/src/style-dictionary/index.ts`

---

## Product Context

### Product Mission
Synkio is a freemium design token synchronization tool that competes with Tokens Studio ($99-299/year). The product follows a three-tier strategy:
1. **Free tier**: Public NPM package (`@synkio/core`) with core CLI functionality
2. **Pro features**: Private/paid features (VariableID migration, advanced workflows)
3. **SaaS Hub**: Cloud-based collaboration and management

**Target Users:** Design systems teams, frontend developers, and product designers who need to sync Figma design tokens to code.

**Core Value Proposition:** Better DX (Developer Experience) than competitors, with:
- Excellent documentation (critical for free tier support)
- Streamlined workflows
- Smart defaults and auto-detection
- Clear, confident user experience

### Current State
The product is in Phase 1B development:
- ✅ Basic sync functionality working
- ✅ Style Dictionary integration
- ✅ Token splitting by mode/group
- 🚧 Init flow needs completion (this spec)
- 🚧 Migration configuration (INCLUDED - optional step in init)
- ❌ Pro features (future)

### Strategic Context
This init enhancement is **critical** because:
1. First impression for free tier users (conversion point to paid)
2. Reduces support burden with excellent documentation
3. Competes directly with Tokens Studio's setup experience
4. Sets tone for product quality and attention to detail

---

## Final Decisions Made

### 1. NPM Package Strategy: PUBLIC npm ✅
**Decision:** Publish `@synkio/core` as PUBLIC package on npmjs.org

**Rationale:**
- Freemium model: Free CLI (public) + Pro features (private) + SaaS Hub
- Competing with Tokens Studio requires free tier for traction
- Public package builds trust for B2B customers
- Killer features (VariableID migration, Tokens Hub) stay private/paid

**Implementation Requirements:**
- Update `package.json` publishConfig:
  ```json
  {
    "name": "@synkio/core",
    "publishConfig": {
      "access": "public",
      "registry": "https://registry.npmjs.org"
    }
  }
  ```
- Add `schemas` directory to `files` array in package.json
- Ensure schema is published with package

**Schema URL (will work):**
`https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json`

---

### 2. Paths Strategy: HYBRID ✅
**Decision:** Convention-based generation WITH explicit storage

**How it works:**
1. Init uses conventions to auto-generate file paths (no prompting for each file)
2. Generated paths are stored explicitly in config
3. Users can manually edit config later for customization

**Example Output:**
```json
{
  "split": {
    "theme": {
      "collection": "theme",
      "strategy": "byMode",
      "output": "tokens/theme",
      "files": {
        "light": "tokens/theme/light.json",
        "dark": "tokens/theme/dark.json"
      }
    }
  }
}
```

**Benefits:**
- Fast init (no per-file prompts)
- Predictable structure (conventions)
- Flexible (can edit manually later)
- Backward compatible with setup.ts format

**Convention Rules:**
- Collection base path: `tokens/{collection-name}/`
- Mode files: `{collection-name}/{mode-name}.json`
- Group files: `{collection-name}/{group-name}.json`
- Single file: `{collection-name}/{collection-name}.json`
- Sanitize names for filesystem (replace spaces, special chars)

---

### 3. Schema Reference: YES - Include it ✅
**Decision:** Create `schemas/tokensrc.schema.json` and reference it in generated configs

**Schema URL in generated config:**
```json
{
  "$schema": "https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json"
}
```

**Requirements:**
1. Create JSON Schema file matching TokensConfig type from `src/types/config.ts`
2. Include schema in published package (add to `files` array)
3. Reference schema in all generated configs
4. Test schema validation works in VS Code

**Schema Must Include:**
- All TokensConfig interface properties
- Nested types (FigmaConfig, PathsConfig, BuildConfig, etc.)
- Descriptions for IDE tooltips
- Examples for common patterns
- Enum values where applicable (strategy: "byMode" | "byGroup" | "flat")

---

### 4. Init Flow Scope: COMPREHENSIVE with EXCELLENT DX ✅
**Decision:** Full-featured init that generates complete, working config in ONE command

**Priority Order:**
1. 🥇 **Excellent documentation** (critical for free tier support)
2. 🥈 **Fix all bugs** from BUGS_AND_FIXES.md
3. 🥉 **Complete init flow** with good UX

**User Experience Goals:**
- ✅ Streamlined prompts (12-23 prompts is OK if UX is smooth)
- ✅ Smart defaults based on detection
- ✅ Clear explanations at each step
- ✅ Generated config works immediately with `synkio sync`
- ✅ Users feel confident, not overwhelmed
- ✅ Honest about complexity (no false promises about prompt count)

**What's In Scope:**
1. Figma connection (URL, token, nodeID)
2. Collection detection and analysis
3. Split strategy configuration per collection
4. File path generation (convention-based)
5. Style Dictionary detection and config
6. Build command configuration
7. Schema reference inclusion
8. **Migration configuration (OPTIONAL)**
9. All critical bug fixes (see section below)

**What's Out of Scope:**
- ❌ Advanced platform adapter customization (use defaults)
- ❌ Pro features (VariableID migration, etc.)
- ❌ Advanced customization (users can edit config manually)

---

### 5. Migration Config: INCLUDED AS OPTIONAL STEP ✅
**Decision:** CHANGED - Migration IS included in init flow as optional final step

**Rationale (from user):**
- "Vi har det jo nærmest klar" - Logic exists in setup.ts (lines 400+)
- "Jeg gider ikke tænke på penge nu" - No freemium complexity yet
- "Vi kan vel altid lave om i det senere" - Keep it simple for v1

**Implementation:**
- Migration prompting happens AT THE END of init flow
- Default = No (users can skip easily)
- If yes, configure platforms with smart defaults
- Port logic from setup.ts (lines 400-600+)
- Reuse `generateStripSegments()` from setup.ts:119-136

**For This Spec:**
- Include migration as optional step
- Clear explanation of what it does
- Smart defaults minimize additional prompts
- If configured, it should work immediately

---

## Critical Bugs to Fix

These MUST be fixed as part of this spec (from BUGS_AND_FIXES.md analysis):

### Bug Fix #1: Retry Loop + Readline/Ora Conflict ⚠️
**Problem:** After spinner fails, readline becomes unresponsive and prompts don't appear.

**Current Code (broken):**
```typescript
const spinner = createSpinner('Connecting to Figma...');
spinner.start();
try {
  fetchedData = await fetchFigmaData({ ... });
  spinner.succeed('Connected to Figma successfully!');
} catch (error) {
  spinner.fail('Failed to connect to Figma');
  throw new Error(...); // PROBLEM: No retry, no readline reset
}
```

**Required Fix:**
```typescript
let fetchedData;
let attempt = 0;
const maxAttempts = 3;
let success = false;

while (!success && attempt < maxAttempts) {
  attempt++;
  const spinner = createSpinner(`Connecting to Figma... (attempt ${attempt}/${maxAttempts})`);
  spinner.start();

  try {
    fetchedData = await fetchFigmaData({ ... });
    spinner.succeed('Connected to Figma successfully!');
    success = true;
  } catch (error) {
    spinner.fail('Connection failed');

    if (attempt < maxAttempts) {
      // CRITICAL: Close and recreate readline after spinner
      rl.close();
      rl = createPrompt();

      const retry = await askYesNo(rl, 'Retry connection?', true);
      if (!retry) {
        throw new Error('Setup cancelled by user');
      }
    } else {
      throw new Error('Max retries exceeded');
    }
  }
}
```

**Why This Matters:**
- Common issue: invalid token, wrong file ID, network issues
- Without retry: user must restart entire init process
- Without readline reset: prompts become broken
- Excellent DX = graceful error handling

---

### Bug Fix #2: File Path Edge Cases ⚠️
**Problem:** Mode/group names can contain characters unsafe for filenames.

**Examples of Problematic Names:**
- Modes: "Dark / High Contrast", "Light (Default)", "iOS/Android"
- Groups: "Color/Palette", "Typography & Spacing", "Size.sm"

**Required Sanitization:**
```typescript
/**
 * Sanitize mode/group name for use in filename
 * - Replace spaces with hyphens
 * - Remove/replace special characters (/, :, *, ?, ", <, >, |)
 * - Convert to lowercase
 * - Prevent path traversal (.., ./)
 * - Check for reserved names (Windows: CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 */
function sanitizeForFilename(name: string): string {
  // Remove leading/trailing spaces
  let sanitized = name.trim();

  // Replace path separators and special chars
  sanitized = sanitized.replace(/[\/\\:*?"<>|]/g, '-');

  // Replace spaces with hyphens
  sanitized = sanitized.replace(/\s+/g, '-');

  // Remove parentheses and brackets
  sanitized = sanitized.replace(/[\(\)\[\]]/g, '');

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Check for Windows reserved names
  const reserved = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4',
                    'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2',
                    'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  if (reserved.includes(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  return sanitized || 'default';
}
```

**Apply Everywhere:**
- Collection names → directory names
- Mode names → file names
- Group names → file names

---

### Bug Fix #3: Realistic Prompt Count ⚠️
**Problem:** Documentation promises "5-7 prompts" but reality is 12-23 for full setup.

**Actual Prompt Count:**
- Base setup: ~8 prompts
- Collections (2-5): 2 × N = 4-10 prompts
- Migration (optional): 3-5 prompts per platform
- **Total: 12-23 prompts** (depending on collections and migration choice)

**Required Fix:**
- Update ALL documentation to be honest about prompt count
- Show progress indicator: "Step 3 of 12"
- Group related prompts with clear headers
- Set correct expectations upfront

**Example Opening Message:**
```
Welcome to Synkio! Let's set up your project.

This will take about 5-10 minutes with 12-20 quick questions.

You'll need:
- Figma file URL
- Figma access token (from figma.com/settings)
- Details about how you want tokens organized

Let's get started!
```

**Show Progress:**
```typescript
function showProgress(step: number, total: number, section: string) {
  console.log(`\n[${'='.repeat(step)}${' '.repeat(total - step)}] Step ${step}/${total}: ${section}`);
}
```

---

### Bug Fix #4: Style Dictionary Detection Timing ⚠️
**Problem:** Current code doesn't detect Style Dictionary early enough to use for smart defaults.

**Current Flow (suboptimal):**
1. Connect to Figma
2. Configure collections
3. Ask about build command
4. Detect Style Dictionary (too late!)

**Required Flow (optimal):**
1. **Detect project setup FIRST** (Style Dictionary, existing tokens, etc.)
2. Connect to Figma
3. Configure collections (use SD version for defaults)
4. Configure build (pre-populate SD section)

**Implementation:**
```typescript
// STEP 1: Early detection
console.log('Analyzing project...');
const detection = detectProject();

// Show what was found
if (detection.styleDictionary.found) {
  console.log(`✓ Style Dictionary ${detection.styleDictionary.version} detected`);
  console.log(`  Config: ${detection.styleDictionary.configPath}`);
}

// STEP 2: Figma connection (unchanged)

// STEP 3: Collection config (use SD version for defaults)
const useDollarPrefix = detection.styleDictionary.version === 'v4';

// STEP 4: Build config (pre-populated)
if (detection.styleDictionary.found) {
  config.build = {
    command: detection.build.command || 'npm run tokens:build',
    styleDictionary: {
      enabled: true,
      config: detection.styleDictionary.configPath,
      version: detection.styleDictionary.version,
    },
  };
}
```

---

### Bug Fix #5: Collection Strategy Prompts - Show Context ⚠️
**Problem:** Users asked to choose strategy without seeing mode/group details.

**Current (insufficient):**
```
Configure collection: theme
Choose strategy: (byMode, byGroup, flat)
```

**Required (informative):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Collection: theme
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Modes detected (2):
  - light (45 tokens)
  - dark (45 tokens)

Groups detected (3):
  - color (30 tokens)
  - typography (10 tokens)
  - spacing (5 tokens)

How should this collection be organized?
  1. By mode (2 files: light.json, dark.json)
  2. By group (3 files: color.json, typography.json, spacing.json)
  3. Single file (1 file: theme.json)
  4. Skip this collection
```

**Implementation:**
- Always show mode names and counts
- Always show group names and counts (for first mode)
- Show preview of file structure for each option
- Help users make informed decisions

---

## Requirements Summary

### Functional Requirements

#### 1. Complete Collection Configuration
**Input:** Fetched Figma baseline data
**Process:**
1. Extract collections using `extractCollections(baseline)`
2. Analyze each collection using `analyzeCollections(collections)`
3. For each collection, prompt user:
   - Display collection name, mode count, group count, token counts
   - Show mode names and group names
   - Ask for split strategy (byMode, byGroup, flat, or skip)
   - Auto-generate file paths using conventions
4. Generate complete `split` config with explicit file mappings

**Output:**
```json
{
  "split": {
    "base": {
      "collection": "base",
      "strategy": "byGroup",
      "output": "tokens/base",
      "files": {
        "color": "tokens/base/color.json",
        "typography": "tokens/base/typography.json",
        "spacing": "tokens/base/spacing.json"
      }
    },
    "theme": {
      "collection": "theme",
      "strategy": "byMode",
      "output": "tokens/theme",
      "files": {
        "light": "tokens/theme/light.json",
        "dark": "tokens/theme/dark.json"
      }
    }
  }
}
```

**Edge Cases to Handle:**
- Zero collections found → warn, allow to continue
- Collection with single mode → prefer byGroup or flat
- Collection with multiple modes → force byMode
- Mode/group names with special characters → sanitize
- Duplicate file paths → detect and warn
- User skips all collections → error, cannot proceed

---

#### 2. Style Dictionary Detection and Configuration
**Input:** Project filesystem
**Process:**
1. **Early Detection** (before Figma connection):
   - Run `detectProject()` to find Style Dictionary config
   - Parse config to extract version (v3 vs v4)
   - Find build command from package.json
   - Detect output paths

2. **Use Detection Results:**
   - Pre-populate build command
   - Set dollar prefix default based on version
   - Auto-fill styleDictionary section

**Output:**
```json
{
  "build": {
    "command": "npm run tokens:build",
    "styleDictionary": {
      "enabled": true,
      "config": "style-dictionary.config.mjs",
      "version": "v4"
    }
  }
}
```

**Edge Cases:**
- No Style Dictionary found → offer to scaffold (future) or skip
- Multiple SD configs found → ask user to choose
- SD config found but no build script → offer to add script
- SD version detection fails → default to v4

---

#### 3. Schema Reference Inclusion
**Input:** None (always include)
**Process:**
1. Add `$schema` property to all generated configs
2. Use unpkg.com URL for public package

**Output:**
```json
{
  "$schema": "https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json",
  "version": "1.0.0",
  ...
}
```

**Requirements for Schema File:**
- Create `packages/core/schemas/tokensrc.schema.json`
- Generate from TypeScript types in `src/types/config.ts`
- Include all required and optional properties
- Add descriptions for tooltips
- Add examples for common patterns
- Validate against actual config examples

---

#### 4. Migration Configuration (OPTIONAL)
**Input:** User choice (yes/no), collections info, Style Dictionary detection
**Process:**
1. **Prompt at end of init flow:**
   ```
   ✅ Configuration complete!

   Optional: Configure automatic migration for breaking token changes?
   This helps update your code when token names change.

   Configure migration now? (y/N)
   ```

2. **If user says YES:**
   - Ask which platforms to configure (multi-select: CSS, JS, Other)
   - For each platform:
     - Prompt for file patterns (suggest defaults)
     - Prompt for exclude patterns (suggest node_modules, dist)
     - Generate transform settings from collection analysis
   - Generate migration config section

3. **If user says NO:**
   - Skip migration config entirely
   - User can add manually later

**Output (if configured):**
```json
{
  "migration": {
    "autoApply": false,
    "platforms": {
      "css": {
        "enabled": true,
        "include": ["**/*.css", "**/*.scss", "src/**/*.css"],
        "exclude": ["node_modules/**", "dist/**"],
        "transform": {
          "prefix": "--",
          "separator": "-",
          "case": "kebab",
          "stripSegments": ["base", "theme", "value", "light", "dark"]
        },
        "patterns": ["var\\(--([a-zA-Z0-9-_]+)\\)"]
      }
    }
  }
}
```

**Smart Defaults from setup.ts:**
- Reuse `generateStripSegments()` (setup.ts:119-136)
- Platform detection and file patterns (setup.ts:400+)
- Transform settings based on Style Dictionary config
- Auto-populate common exclude patterns

**Edge Cases:**
- User skips migration → No migration section in config
- User configures but provides no patterns → Use defaults
- Multiple platforms selected → Configure each separately
- Style Dictionary version affects transform defaults

---

#### 5. Comprehensive Error Handling
**Requirements:**
- Retry loop for Figma connection (max 3 attempts)
- Readline reset after each spinner failure
- Clear error messages with actionable next steps
- Graceful degradation (allow partial config)
- Validation before saving config

**Error Scenarios:**
| Error | User-Friendly Message | Recovery |
|-------|----------------------|----------|
| Invalid token | "Could not authenticate with Figma. Check your access token at figma.com/settings" | Retry prompt |
| Invalid file ID | "File not found. Check the URL and ensure you have access" | Re-prompt for URL |
| Network failure | "Connection failed. Check your internet and try again" | Retry with backoff |
| No collections found | "No variable collections found in this file. Ensure you're using a file with Figma Variables" | Continue with warning |
| File write error | "Could not write config. Check permissions for: [path]" | Show path, exit |

---

### Non-Functional Requirements

#### User Experience
- **Speed:** Complete setup in < 10 minutes
- **Clarity:** Every prompt has context and example
- **Confidence:** Users understand what's being configured
- **Progress:** Show step numbers (e.g., "Step 5 of 15")
- **Defaults:** Smart defaults for 80% use cases
- **Escape hatches:** Allow skip/manual edit options

#### Code Quality
- Remove all `[DEBUG]` console.log statements
- Remove unused imports (`backupBaseline`, `getBaselinePath` from init.ts)
- Consistent error handling patterns
- Proper TypeScript types (no `any`)
- JSDoc comments for public functions
- Unit tests for core logic (sanitizeForFilename, path generation)

#### Documentation
- Update CLI help text with realistic prompt count
- Add examples to README
- Document schema structure
- Comment complex logic inline
- Add troubleshooting section for common errors

---

## Technical Implementation Notes

### Files to Modify

#### Primary File: `packages/core/src/cli/commands/init.ts`
**Current state:** Simplified init that creates minimal config
**Required changes:**
1. Add early project detection (line ~125, before Figma connection)
2. Add collection analysis after Figma fetch (line ~175)
3. Add collection configuration loop with prompts (new section)
4. Add file path generation using conventions (new function)
5. Add Style Dictionary config population (after build prompts)
6. Add schema reference to generated config
7. Add retry loop with readline reset for Figma connection
8. Add sanitizeForFilename utility function
9. **Add optional migration configuration prompts (at end)**
10. Remove all DEBUG statements
11. Remove unused imports

**Estimated LOC:** +250 lines (current: 318, target: ~570)

#### New File: `packages/core/schemas/tokensrc.schema.json`
**Purpose:** JSON Schema for IDE autocomplete
**Generation:** Manual creation based on types/config.ts
**Size:** ~300-500 lines (comprehensive schema)

#### Files to Update (minor):
- `packages/core/package.json` → Update publishConfig, add schemas to files
- `packages/core/src/cli/commands/setup.ts` → Add deprecation notice (optional)
- `packages/core/README.md` → Update init command documentation

---

### Code Reuse from setup.ts

**Functions to Port:**
1. `generateStripSegments()` (lines 119-136) → Port for migration config
2. `createPlatformsConfig()` → Already available from adapters/index.ts
3. Platform defaults and patterns (lines 400+) → Adapt for migration prompts

**Functions to Reference (not port):**
1. `detectProject()` from `src/detect/index.ts` → Use as-is
2. `analyzeCollections()` from `src/tokens/split.ts` → Use as-is
3. `detectAndParseStyleDictionary()` from `src/style-dictionary/index.ts` → Use as-is

---

### Path Generation Conventions

**Convention Rules:**
```typescript
function generateFilePaths(
  collectionName: string,
  strategy: 'byMode' | 'byGroup' | 'flat',
  keys: string[] // mode names or group names
): { output: string; files: { [key: string]: string } } {

  const baseDir = `tokens/${sanitizeForFilename(collectionName)}`;
  const files: { [key: string]: string } = {};

  if (strategy === 'flat') {
    // All groups map to single file
    const fileName = `${sanitizeForFilename(collectionName)}.json`;
    keys.forEach(key => {
      files[key] = `${baseDir}/${fileName}`;
    });
  } else {
    // Each key gets its own file
    keys.forEach(key => {
      const fileName = `${sanitizeForFilename(key)}.json`;
      files[key] = `${baseDir}/${fileName}`;
    });
  }

  return { output: baseDir, files };
}
```

**Examples:**
- Collection "Base Tokens", strategy "byGroup", groups ["color", "typography"]
  - output: `tokens/base-tokens`
  - files: `{ "color": "tokens/base-tokens/color.json", "typography": "tokens/base-tokens/typography.json" }`

- Collection "Theme", strategy "byMode", modes ["Light / Default", "Dark"]
  - output: `tokens/theme`
  - files: `{ "Light / Default": "tokens/theme/light-default.json", "Dark": "tokens/theme/dark.json" }`

---

### Migration Configuration Flow

**When to Prompt:**
- AT THE END of init flow
- After all other config is complete
- With clear opt-out (default = No)

**Prompt Structure:**
```
✅ Configuration complete!

Optional: Configure automatic migration for breaking token changes?
This helps update your code when token names change.

Configure migration now? (y/N) [Default: No]
```

**If YES, ask:**
1. Which platforms to configure? (multi-select)
   - [ ] CSS/SCSS
   - [ ] JavaScript/TypeScript
   - [ ] Other

2. For EACH selected platform:
   - File patterns to scan (suggest defaults based on detection)
   - Exclude patterns (suggest node_modules/*, dist/*)
   - Show generated transform settings (auto from collection analysis)

**Smart Defaults:**
- CSS: `["**/*.css", "**/*.scss"]`, prefix: `--`, separator: `-`, case: `kebab`
- JS: `["**/*.js", "**/*.ts", "**/*.tsx"]`, prefix: ``, separator: `.`, case: `camel`
- Strip segments: Generated from `generateStripSegments(collectionsInfo)`

**Estimated Additional Prompts (if user says yes):**
- 1 prompt: Configure migration?
- 1 prompt: Select platforms
- 2-3 prompts per platform (file patterns, excludes)
- **Total: 3-5 prompts** for migration (only if user opts in)

---

### Schema Generation Strategy

**Approach:** Manual JSON Schema creation (not auto-generated)

**Why manual?**
- TypeScript to JSON Schema conversion is lossy
- Need custom descriptions and examples
- Want fine-tuned validation rules
- Better control over defaults

**Schema Structure:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Synkio Configuration",
  "description": "Configuration file for Synkio token sync",
  "type": "object",
  "required": ["version", "figma", "paths"],
  "properties": {
    "$schema": { "type": "string" },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Config version (e.g., 1.0.0)"
    },
    "figma": { "$ref": "#/definitions/FigmaConfig" },
    "migration": { "$ref": "#/definitions/MigrationConfig" },
    ...
  },
  "definitions": {
    "FigmaConfig": { ... },
    "PathsConfig": { ... },
    "MigrationConfig": { ... },
    ...
  }
}
```

**Validation:**
- Test schema against example configs
- Verify in VS Code with actual tokensrc.json
- Check autocomplete works
- Validate error messages are helpful

---

### Package.json Changes Required

**Current (GitHub private):**
```json
{
  "name": "@rgehrkedk/synkio-core",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "files": ["dist", "templates"]
}
```

**Required (Public npm):**
```json
{
  "name": "@synkio/core",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  },
  "files": [
    "dist",
    "templates",
    "schemas"
  ]
}
```

**Additional changes:**
- Ensure package name is available on npm (check first!)
- Update README with new package name
- Update documentation URLs
- Test unpkg.com URL after first publish

---

## Edge Cases and Constraints

### Edge Case #1: No Collections Found
**Scenario:** Figma file has no variable collections
**Handling:**
- Show warning: "No variable collections found"
- Explain: "This file doesn't contain Figma Variables. Check that you're using the correct file."
- Offer: "Continue anyway to save connection config?" (Yes/No)
- If Yes: Save minimal config with figma section only
- If No: Exit gracefully

### Edge Case #2: Collection Name Conflicts
**Scenario:** Two collections sanitize to same directory name
- Example: "Base Tokens" and "Base/Tokens" both → "base-tokens"
**Handling:**
- Detect conflict before creating paths
- Append number suffix: "base-tokens", "base-tokens-2"
- Warn user about sanitization

### Edge Case #3: Existing tokensrc.json Found
**Current behavior:** Show warning, exit
**Required behavior:** Offer to overwrite or merge
```
Configuration already exists: tokensrc.json

What would you like to do?
  1. Overwrite (replace with new config)
  2. Cancel (keep existing)
```

### Edge Case #4: Environment Variable Not Set
**Scenario:** User enters token but FIGMA_ACCESS_TOKEN not in .env
**Handling:**
- After successful connection, check if .env exists
- If not, offer to create: "Save token to .env file for future use?"
- Create .env with FIGMA_ACCESS_TOKEN=xxx
- Add .env to .gitignore if not present

### Edge Case #5: Very Large Collections
**Scenario:** Collection with 20+ modes or groups
**Handling:**
- Show warning: "This collection has 25 modes. Consider splitting it in Figma."
- Allow to proceed
- Truncate display: "Modes: light, dark, high-contrast... (22 more)"
- Generate all file paths (no truncation in config)

### Edge Case #6: User Skips Migration
**Scenario:** User says "No" to migration configuration
**Handling:**
- Skip migration prompts entirely
- Do NOT include migration section in config (or include with empty platforms)
- Show message: "Migration can be added later by editing tokensrc.json"
- Config remains valid and functional

---

## Success Criteria

### Primary Goals
- ✅ Generated tokensrc.json works immediately with `synkio sync`
- ✅ All collections configured correctly with explicit file paths
- ✅ Style Dictionary detected and configured (if present)
- ✅ Migration optionally configured (if user opts in)
- ✅ Schema provides IDE autocomplete
- ✅ User completes init in < 10 minutes
- ✅ No bugs from BUGS_AND_FIXES.md remain

### User Experience Metrics
- ✅ Clear progress indication (step X of Y)
- ✅ Informative prompts with examples
- ✅ Smart defaults for 80% of cases
- ✅ Graceful error handling with retry
- ✅ Honest documentation (12-23 prompts, not 5-7)
- ✅ Migration is clearly optional (not forced)

### Code Quality Metrics
- ✅ Zero DEBUG statements
- ✅ Zero unused imports
- ✅ 100% TypeScript (no `any`)
- ✅ JSDoc comments on public functions
- ✅ Unit tests for path generation and sanitization

### Documentation Goals
- ✅ Updated CLI help with realistic info
- ✅ README examples with full flow
- ✅ Schema documentation
- ✅ Troubleshooting guide for common errors
- ✅ Migration guide from setup.ts (for existing users)

### Migration-Specific Success Criteria
- ✅ If migration configured, generated config is immediately functional
- ✅ Transform settings match Style Dictionary version
- ✅ File patterns match project structure
- ✅ Strip segments generated from collection analysis
- ✅ Default patterns work for 80% of projects

---

## Updated Init Flow

**Complete init flow steps:**

1. Welcome + check existing config
2. **Detect project setup FIRST** (Style Dictionary, paths, build commands)
3. Prompt: Figma credentials (file ID, node ID, access token)
4. **Retry loop:** Fetch + analyze Figma data (max 3 attempts with retry)
5. Show collections detected
6. For each collection:
   - Show modes and groups with counts
   - Prompt for strategy (byMode, byGroup, flat, skip)
   - Auto-generate file paths (conventions)
7. Populate build.styleDictionary section (if detected)
8. Add $schema reference
9. **OPTIONAL: Prompt for migration config**
10. **IF YES:** Configure platforms + file patterns
11. Save complete config
12. Success message + next steps

**Estimated Prompts:**
- Base setup: 8 prompts
- Collections (2-5): 1-2 × N = 2-10 prompts
- Migration (optional): 0 prompts if skipped, 3-5 if configured
- **Total: 10-23 prompts** (honest estimate)

---

## Testing Strategy

### Unit Tests
**Functions to test:**
1. `sanitizeForFilename()` - edge cases: special chars, Windows reserved, empty
2. `generateFilePaths()` - all strategies, multiple keys, conflicts
3. `validateFigmaUrl()` - various URL formats, invalid inputs
4. `extractFileIdFromUrl()` - different Figma URL patterns
5. `generateStripSegments()` - collection analysis, mode/group extraction

### Integration Tests
**Flows to test:**
1. Full init flow (mock Figma API)
2. Retry logic with failures
3. Style Dictionary detection (mock filesystem)
4. Config generation and validation
5. Schema validation against generated configs
6. Migration config generation (optional flow)

### Manual Testing Checklist
- [ ] Run init with valid Figma file (multi-collection)
- [ ] Test retry with invalid token
- [ ] Test with no Style Dictionary
- [ ] Test with Style Dictionary v3
- [ ] Test with Style Dictionary v4
- [ ] Test with existing tokensrc.json
- [ ] Test with special characters in collection names
- [ ] Verify schema autocomplete in VS Code
- [ ] Test generated config with `synkio sync`
- [ ] Test migration: Skip (say No)
- [ ] Test migration: Configure CSS platform
- [ ] Test migration: Configure multiple platforms
- [ ] Verify generated migration patterns work

---

## Migration Path (for existing users)

### From setup.ts
**Users currently using:** `synkio setup` (deprecated)
**Migration steps:**
1. Rename command: `setup` → `init`
2. Add deprecation warning to setup.ts
3. Keep setup.ts working for 1-2 versions
4. Document differences in CHANGELOG

**Key differences:**
- `init` uses conventions for file paths (setup asks for each)
- `init` makes migration OPTIONAL (setup includes it by default)
- `init` uses hybrid config format (setup uses split only)

**Backward compatibility:**
- Config format unchanged (split section, migration section)
- File paths unchanged (explicit mapping)
- No breaking changes to existing configs

---

## Phase 2 Considerations

### Pro Feature Hooks
**Where to add teasers:**
1. After detecting breaking changes: "Upgrade to Pro for automatic code migration"
2. After complex collection setup: "Pro users get advanced customization"
3. End of init: "Want team collaboration? Try Synkio Hub"

**Implementation:**
- Subtle mentions (not pushy)
- Value-focused (solve real pain)
- Easy opt-in (link to upgrade page)

### Future Enhancements
**Possible additions:**
1. Template system ("Use preset: React, Vue, Angular")
2. Interactive file path customization (opt-in)
3. Validation rules (min/max tokens per file)
4. Auto-fix for common issues (invalid names, conflicts)
5. Config migration tool (v1 → v2)

---

## Documentation Requirements

### README Updates
**Sections to add/update:**
1. **Installation** - New package name (@synkio/core)
2. **Quick Start** - Full init flow example
3. **Configuration** - Schema reference, all options (including migration)
4. **Troubleshooting** - Common errors and fixes
5. **Examples** - Real-world config examples

### CLI Help Text
**`synkio init --help` output:**
```
Initialize Synkio configuration

Usage: synkio init [options]

Options:
  --template <name>  Use a config template (optional)
  --yes, -y          Non-interactive mode (use env vars)
  -h, --help         Display help

Interactive Setup:
  This command will guide you through ~12-20 questions to set up
  your Synkio configuration. You'll need:

  - Figma file URL
  - Figma access token (from figma.com/settings)
  - Details about how you want tokens organized
  - (Optional) Migration configuration for code updates

  The setup takes about 5-10 minutes and generates a complete
  tokensrc.json that works immediately with 'synkio sync'.

Examples:
  synkio init
  synkio init --template react
  synkio init --yes  # Use FIGMA_FILE_URL and FIGMA_ACCESS_TOKEN from env

Learn more: https://synkio.dev/docs/cli/init
```

### Schema Documentation
**In schema file (descriptions):**
- Every property has description
- Complex properties have examples
- Enums have explanations
- References to docs where applicable
- Migration section clearly marked as optional

---

## Final Notes

### Alpha Omega: Documentation
**Why this matters:**
- Free tier = self-service support
- Good docs = fewer support requests
- Good docs = higher conversion to paid
- Good docs = competitive advantage

**Documentation deliverables:**
1. ✅ Inline code comments (JSDoc)
2. ✅ CLI help text (--help flag)
3. ✅ README examples (quick start)
4. ✅ Schema descriptions (tooltips)
5. ✅ Error messages (actionable)
6. ✅ Troubleshooting guide (common issues)
7. ✅ Migration docs (setup.ts → init)

### Competitive Positioning
**vs Tokens Studio:**
- Tokens Studio: Complex UI, steep learning curve, expensive ($99-299/yr)
- Synkio: Simple CLI, excellent DX, free tier + optional Pro

**Our advantages:**
- ✅ Better documentation
- ✅ Simpler workflow (one command)
- ✅ Open source (transparency)
- ✅ Modern tech stack (TS, ESM)

**Their advantages:**
- ❌ Established user base
- ❌ Figma plugin (GUI)
- ❌ More features (currently)

**Strategy:** Win on DX and documentation, add features incrementally.

---

## Summary

This spec defines a **comprehensive init flow enhancement** that:

1. ✅ Generates complete, working tokensrc.json in one command
2. ✅ Uses smart conventions for file paths (no per-file prompts)
3. ✅ Stores explicit paths in config (manual editing allowed)
4. ✅ Detects and configures Style Dictionary automatically
5. ✅ Includes schema reference for IDE autocomplete
6. ✅ **Optionally configures migration** (user choice at end)
7. ✅ Fixes all critical bugs (retry, sanitization, detection)
8. ✅ Provides excellent UX (clear, confident, fast)
9. ✅ Sets foundation for freemium model (Pro hooks)

**Migration Decision:** INCLUDED as optional step (not deferred to Phase 2)
- Logic already exists in setup.ts
- Adds 0-5 prompts (if user opts in)
- Smart defaults minimize complexity
- Users can skip easily (default = No)

**Ready for spec writing:** YES ✅

All requirements documented, decisions finalized, technical approach defined.
