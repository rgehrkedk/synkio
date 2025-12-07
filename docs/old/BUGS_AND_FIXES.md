# Synkio Core - Bugs Found and Required Fixes

## 🐛 Critical Bugs Fixed (Session: 2025-12-06)

### 1. **Init: accessToken not passed to Figma API**
- **File:** `packages/core/src/cli/commands/init.ts:159`
- **Problem:** User enters token in CLI but `fetchFigmaData()` called without `accessToken` parameter
- **Symptom:** "FIGMA_ACCESS_TOKEN not found" error despite entering token
- **Fix Applied:** Added `accessToken: accessToken || undefined` to fetchFigmaData call
- **Status:** ✅ FIXED

### 2. **Init: Incorrect mode counting**
- **File:** `packages/core/src/cli/commands/init.ts:175`
- **Problem:** Used `collection.$modes` instead of `analyzeCollections()` to count modes
- **Symptom:** Shows "0 modes" for all collections
- **Fix Applied:** Changed to use `analyzeCollections()` for correct mode detection
- **Status:** ✅ FIXED

### 3. **Init: Readline/Ora conflict prevents prompts**
- **File:** `packages/core/src/cli/commands/init.ts:171-172`
- **Problem:** `readline` and `ora` spinner conflict, stdin becomes unresponsive
- **Symptom:** Prompts don't appear after spinner stops
- **Fix Applied:** Close and reopen readline interface after spinner completes
- **Status:** ✅ FIXED

### 4. **API: Misleading error message about .env location**
- **File:** `packages/core/src/figma/api.ts:41`
- **Problem:** Error says "Set it in figma-sync/.figma/.env" but code loads from `.env` in root
- **Symptom:** Users create .env in wrong location
- **Fix Applied:** Updated message to "Set it in .env, .env.local, or as an environment variable"
- **Status:** ✅ FIXED

### 5. **Sync: Environment variables not loaded**
- **File:** `packages/core/src/cli/commands/sync-cmd.ts:285`
- **Problem:** `loadEnv()` never called in sync command
- **Symptom:** "FIGMA_ACCESS_TOKEN not found" despite .env file existing
- **Fix Applied:** Added `loadEnv()` call before loading config
- **Status:** ✅ FIXED

### 6. **Sync: Hardcoded baseline paths ignore config**
- **File:** `packages/core/src/cli/commands/sync-cmd.ts:342`
- **Problem:** Uses `getBaselinePath()` which returns hardcoded `.figma/data` instead of `config.paths.baseline`
- **Symptom:** Baseline saved to wrong directory, changes detected repeatedly
- **Fix Applied:** Changed to use `config.paths.baseline` directly
- **Status:** ✅ FIXED

### 7. **Sync: Backup uses hardcoded paths**
- **File:** `packages/core/src/cli/commands/sync-cmd.ts:308-316`
- **Problem:** `backupBaseline()` uses hardcoded paths from `getBaselinePath()`
- **Symptom:** Backup created in wrong directory, sync always shows "first sync"
- **Fix Applied:** Manual backup using `fs.copyFileSync(config.paths.baseline, config.paths.baselinePrev)`
- **Status:** ✅ FIXED

---

## 🚧 Required Fixes for Init Flow

### 1. **Init does NOT generate complete tokensrc.json**
**Current State:**
- Only creates minimal config with empty `collections: {}`
- Missing `split`, `migration`, `build.styleDictionary` configs

**Required:**
- Detect collections from Figma data
- Ask user about split strategy per collection
- Generate complete `split` config with file mappings
- Detect Style Dictionary and populate `build.styleDictionary`
- OPTIONALLY configure migration (after breaking changes detected)

**Files to modify:**
- `packages/core/src/cli/commands/init.ts`

---

## 📋 Missing Init Flow Features

### 1. **Collection Configuration**
**What's needed:**
- After fetching from Figma, analyze collections using `analyzeCollections()`
- For each collection, ask user:
  - Output strategy (`byMode`, `byGroup`, or `flat`)
  - Base output directory
  - File paths for each mode/group
- Generate `split` config object

**Example output needed:**
```json
{
  "split": {
    "base": {
      "collection": "base",
      "strategy": "byMode",
      "output": "tokens/base",
      "files": {
        "value": "tokens/base/base.json"
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

### 2. **Style Dictionary Detection & Config**
**What's needed:**
- Detect Style Dictionary config file (already done in code?)
- Parse to get platforms and version
- Populate `build.styleDictionary` section

**Example output needed:**
```json
{
  "build": {
    "command": "npm run build:tokens",
    "styleDictionary": {
      "enabled": true,
      "config": "style-dictionary.config.mjs",
      "version": "v4"
    }
  }
}
```

### 3. **Migration Configuration (OPTIONAL)**
**When to configure:**
- AFTER first sync OR
- AFTER sync with breaking changes detected
- Should be OPTIONAL prompt

**What's needed:**
- Ask "Do you want to configure code migration for breaking changes?"
- If yes, ask about platforms (CSS, JS, etc.)
- For each platform:
  - File patterns to scan (`include`, `exclude`)
  - Transform settings (prefix, separator, case, stripSegments)
  - Token usage patterns (regex for var() etc.)

**Example output needed:**
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
          "stripSegments": ["base", "theme", "value", "light", "dark", "color"]
        },
        "patterns": ["var\\(--([a-zA-Z0-9-_]+)\\)"]
      }
    }
  }
}
```

### 4. **Schema Reference**
**What's needed:**
- Add `"$schema": "./schemas/tokensrc.schema.json"` to generated config
- Provides IDE autocomplete support

---

## 📊 Report Generation Issues

### 1. **Diff Report Path Incorrect**
**Current:**
- Report saved to: `/Users/rasmus/test-synkio/.figma/reports/diff-report.md`
- Config says: `figma-sync/.figma/reports`

**Problem:**
- `getDiffReportPath()` likely uses hardcoded `.figma/reports` instead of `config.paths.reports`

**Fix needed:**
- Update sync-cmd.ts to use `config.paths.reports` for diff report
- Ensure directory is created before saving

### 2. **Report Content**
**To verify:**
- Is diff report properly formatted?
- Does it include all change types (modified, renamed, added, removed)?
- Is it Markdown formatted and readable?

---

## ✅ Implementation Checklist

### Phase 1: Fix Init Flow
- [ ] Import and use `analyzeCollections()` in init
- [ ] After Figma connection, analyze collections
- [ ] For each collection, prompt user for:
  - [ ] Split strategy (byMode/byGroup/flat)
  - [ ] Output directory
  - [ ] File paths for each mode/group
- [ ] Generate complete `split` config
- [ ] Detect Style Dictionary config and version
- [ ] Populate `build.styleDictionary` section
- [ ] Add `$schema` reference
- [ ] Save complete config

### Phase 2: Add Migration Setup (Optional)
- [ ] Create new command: `synkio setup-migration`
- [ ] OR add to init flow as optional prompt
- [ ] Prompt for platforms (CSS, JS, etc.)
- [ ] For each platform, prompt for:
  - [ ] File patterns (include/exclude)
  - [ ] Transform settings
  - [ ] Token usage patterns
- [ ] Update existing config with migration section

### Phase 3: Fix Report Paths
- [ ] Update `sync-cmd.ts` to use `config.paths.reports`
- [ ] Ensure reports directory is created
- [ ] Verify diff report format and content

### Phase 4: Code Cleanup
- [ ] Remove all `[DEBUG]` console.log statements
- [ ] Remove unused imports (`backupBaseline`, `getBaselinePath`)
- [ ] Update JSDoc comments where needed
- [ ] Run linter and fix warnings

### Phase 5: Testing
- [ ] Test full init flow from scratch
- [ ] Test sync with no changes
- [ ] Test sync with breaking changes
- [ ] Test migration setup (if implemented)
- [ ] Verify all reports are generated correctly

---

## 🎯 Priority Order

1. **CRITICAL:** Fix init flow to generate complete `split` config
2. **HIGH:** Add Style Dictionary metadata detection
3. **MEDIUM:** Migration setup (can be separate command)
4. **LOW:** Report path fixes (works, just wrong location)
5. **LOW:** Code cleanup and debug removal

---

## 📝 Notes

- Current `init.ts` is simplified version (Phase 1B)
- Old `setup.ts` has full implementation but is deprecated
- May need to port logic from `setup.ts` to `init.ts`
- Keep backward compatibility with `split` config format
- Migration config should be OPTIONAL (not required for basic usage)

---

## 🔗 Related Files

- `packages/core/src/cli/commands/init.ts` - Main init command
- `packages/core/src/cli/commands/setup.ts` - Old setup (has full logic)
- `packages/core/src/cli/commands/sync-cmd.ts` - Sync command
- `packages/core/src/types/config.ts` - Config type definitions
- `packages/core/src/tokens/split.ts` - Collection analysis
- `packages/core/src/detect/index.ts` - Project detection (Style Dictionary)
