# Init Flow Requirements - Answers to Specialist Questions

## Responses to Questions

### 1. Collection Configuration Prompts - Scope

**RECOMMENDATION: Simplify significantly**

**Rationale:**
- Current `setup.ts` comprehensive mapping (lines 612-789) is TOO complex for init flow
- Users get overwhelmed with file detection, conflict resolution, manual selection
- Convention over configuration is better for first-time setup

**Proposed approach:**
```
For each collection:
1. Show: "{collection} ({modes.length} mode(s), ~{totalTokens} tokens)"
2. Ask: "Output strategy?"
   - byMode (recommended for multi-mode)
   - byGroup (for single mode with groups)
   - flat (single file)
3. Ask: "Output directory?" (default: tokens/{collection})
4. AUTO-GENERATE file paths using convention:
   - byMode: {output}/{mode}.json
   - byGroup: {output}/{group}.json
   - flat: {output}.json
```

**Skip entirely:**
- File conflict detection
- Manual file path selection
- Individual file mapping prompts

**Why:**
- User can always edit tokensrc.json manually later
- 95% of users will use conventions anyway
- Reduces friction in setup

---

### 2. Style Dictionary Detection - Timing

**RECOMMENDATION: Detect early, use for smart defaults**

**Proposed flow:**
```
1. Detect Style Dictionary config immediately after project analysis
2. If found:
   - Parse to get version (v3/v4) and existing output paths
   - Use those paths as DEFAULTS for token output prompts
   - Pre-populate build.styleDictionary section
3. If not found:
   - Use fallback defaults (tokens/, styles/tokens)
   - Offer to scaffold Style Dictionary (like setup.ts does)
```

**Benefits:**
- Smart defaults based on existing project structure
- Fewer prompts (defaults auto-filled)
- Better integration with existing tooling

**Implementation:**
- Reuse `detectAndParseStyleDictionary()` from `detect/index.ts`
- Call early (right after `detectProject()`)

---

### 3. User Experience - Prompt Complexity

**RECOMMENDATION: Streamlined "happy path"**

**Exactly as suggested:**

✅ Auto-detect Style Dictionary if present
✅ Use smart defaults for paths
✅ Only ask essentials:
  - Figma credentials (file ID, token, node ID)
  - Split strategy per collection
  - Build command (if not auto-detected)
✅ Skip platform adapter configuration (use defaults)

**Additional simplifications:**
- NO token format prompt (auto-detect from Style Dictionary version)
- NO individual file path prompts (use conventions)
- NO output path customization prompts (use detected/default)

**Result:**
- ~5-7 prompts total (down from ~20+ in setup.ts)
- 2 minutes setup time (down from 10+ minutes)
- Can always edit tokensrc.json manually for advanced config

---

### 4. Migration Config - Separate Command or Inline

**RECOMMENDATION: Separate command (`synkio setup-migration`)**

**Rationale:**

1. **Init should be minimal** - get users syncing ASAP
2. **Migration is advanced** - most users won't need it initially
3. **Better timing** - set up migration AFTER first sync shows breaking changes

**Proposed flow:**
```bash
# First run
$ synkio init
# ... setup completes ...

# First sync detects breaking changes
$ synkio sync
⚠ 3 breaking changes detected!
┌─────────────────────────┬──────────┬──────────┐
│ Token Path              │ Old      │ New      │
├─────────────────────────┼──────────┼──────────┤
│ theme.dark.color.bg     │ bg-dark  │ surface  │
└─────────────────────────┴──────────┴──────────┘

💡 Tip: Run 'synkio setup-migration' to configure automatic code migration for breaking changes.

# User decides to set up migration
$ synkio setup-migration
# Interactive prompts for platforms, patterns, etc.
```

**Benefits:**
- Clean separation of concerns
- User learns about migration when relevant
- Can be run multiple times to update config

**Alternative (if you prefer inline):**
- Add SINGLE yes/no prompt at END of init: "Configure migration? (you can do this later)" (default: no)
- If yes, ask minimal questions (just CSS platform with defaults)
- Full migration setup still available via `synkio setup-migration`

---

### 5. Error Handling - Figma Connection Failure

**RECOMMENDATION: Add retry loop**

**Proposed flow:**
```typescript
let connectionSuccess = false;
let retryCount = 0;
const MAX_RETRIES = 3;

while (!connectionSuccess && retryCount < MAX_RETRIES) {
  try {
    fetchedData = await fetchFigmaData({ ... });
    connectionSuccess = true;
  } catch (error) {
    spinner.fail('Failed to connect to Figma');
    console.error(error.message);

    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const retry = await askYesNo(rl, 'Try again with different credentials?', true);
      if (!retry) {
        throw new Error('Setup cancelled by user');
      }

      // Re-prompt for credentials
      const newFileId = await askText(rl, 'Figma file ID:', fileId);
      const newToken = await askText(rl, 'Figma access token:', accessToken);
      const newNodeId = await askText(rl, 'Node ID (optional):', nodeId);

      fileId = newFileId || fileId;
      accessToken = newToken || accessToken;
      nodeId = newNodeId || nodeId;
    } else {
      throw error;
    }
  }
}
```

**Benefits:**
- No need to re-enter ALL info if just token was wrong
- Better UX for typos
- Still fails fast after 3 attempts

---

### 6. File Path Strategy - Explicit vs Convention

**RECOMMENDATION: Convention-based with explicit fallback**

**Approach:**

1. **Use conventions by default:**
   ```typescript
   function generateFilePath(
     collection: string,
     strategy: 'byMode' | 'byGroup' | 'flat',
     key: string, // mode or group name
     outputDir: string
   ): string {
     if (strategy === 'byMode') {
       return path.join(outputDir, `${key}.json`);
     } else if (strategy === 'byGroup') {
       return path.join(outputDir, `${key}.json`);
     } else {
       return `${outputDir}.json`;
     }
   }
   ```

2. **Store BOTH in config:**
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

**Why store explicit paths:**
- Allows manual customization later
- Backwards compatible with setup.ts format
- Clear contract for where files go

**Why use conventions:**
- Fast initial setup
- Predictable structure
- Less prompts

---

### 7. Debug Cleanup - Scope

**RECOMMENDATION: Clean up both init.ts AND sync-cmd.ts, LEAVE setup.ts alone**

**Files to clean:**
- ✅ `cli/commands/init.ts` - remove any debug logs
- ✅ `cli/commands/sync-cmd.ts` - remove `[DEBUG]` logs we added
- ✅ `files/loader.ts` - remove `[DEBUG]` logs we added
- ❌ `cli/commands/setup.ts` - LEAVE AS IS (deprecated, might reference later)

**Reasoning:**
- setup.ts is deprecated but still valuable reference
- Don't want to accidentally break it
- Users shouldn't use it anyway

---

### 8. Schema Reference - Relative Path

**RECOMMENDATION: Fixed relative path, assume tokensrc.json in project root**

**Implementation:**
```json
{
  "$schema": "https://unpkg.com/@rgehrkedk/synkio-core/schemas/tokensrc.schema.json"
}
```

**OR if local schema exists:**
```json
{
  "$schema": "./node_modules/@rgehrkedk/synkio-core/schemas/tokensrc.schema.json"
}
```

**Rationale:**
- tokensrc.json is ALWAYS in project root (by convention)
- Schema can be published to npm registry
- Remote URL works without local installation
- Fallback to local if user has package installed

**Note:** Schema file needs to be created/published first!

---

## Existing Code Reuse

### Interactive CLI flows
**File:** `packages/core/src/cli/commands/setup.ts`
- Lines 612-789: Collection file mapping (TOO complex, simplify)
- Lines 127-213: Interactive setup pattern (GOOD reference)
- Lines 259-275: Build choice selection (REUSE pattern)

**Helper functions:**
**File:** `packages/core/src/cli/prompt.ts`
- `askYesNo()` - yes/no questions ✅
- `askText()` - text input ✅
- `askChoice()` - single choice ✅
- `askMultipleChoice()` - multiple choices ✅

### Configuration generation
**File:** `packages/core/src/cli/commands/setup.ts`
- Lines 69-92: `createDefaultConfig()` - REUSE pattern
- Lines 119-136: `generateStripSegments()` - REUSE for migration

### File detection patterns
**File:** `packages/core/src/detect/index.ts`
- `detectProject()` - detects Style Dictionary, framework, paths ✅
- `detectAndParseStyleDictionary()` - parses SD config ✅
- `findCollectionMatches()` - finds existing token files ✅

**File:** `packages/core/src/detect/scaffold.ts`
- `scaffoldStyleDictionary()` - creates SD config if missing ✅
- `detectModuleType()` - ESM vs CommonJS ✅
- `addBuildScript()` - adds npm script ✅

### Path resolution patterns
**File:** `packages/core/src/files/paths.ts`
- All path helpers (but they use hardcoded paths - we fixed this in sync-cmd)

### Validation helpers
**File:** `packages/core/src/files/loader.ts`
- Lines 107-140: `validateConfig()` - validates tokensrc.json ✅

### Token analysis
**File:** `packages/core/src/tokens/split.ts`
- Lines 24-37: `extractCollections()` - extracts collections from baseline ✅
- Lines 42-68: `analyzeCollections()` - analyzes modes/groups/counts ✅

---

## Recommended Implementation Plan

### Phase 1: Core Init Flow (PRIORITY)
```typescript
// packages/core/src/cli/commands/init.ts

async function initCommand() {
  // 1. Welcome + check existing config
  // 2. Detect project (Style Dictionary, paths)
  // 3. Prompt: Figma credentials (with retry)
  // 4. Fetch + analyze collections
  // 5. For each collection: prompt strategy + output dir
  // 6. Auto-generate file paths (conventions)
  // 7. Detect/populate build.styleDictionary
  // 8. Add $schema reference
  // 9. Save config
  // 10. Success message + next steps
}
```

### Phase 2: Migration Setup (Separate Command)
```bash
# New command
synkio setup-migration
```

**Prompts:**
- Which platforms? (CSS, JS, etc.)
- File patterns? (pre-filled defaults)
- Transform settings? (pre-filled from analyzeCollections)

### Phase 3: Cleanup
- Remove debug logs
- Update tests
- Documentation

---

## Summary Recommendations

| Question | Recommendation |
|----------|---------------|
| 1. Collection prompts | **Simplify:** strategy + output only, auto-generate paths |
| 2. SD Detection timing | **Early:** detect immediately, use for defaults |
| 3. Prompt complexity | **Streamlined:** 5-7 prompts, skip advanced options |
| 4. Migration config | **Separate command:** `synkio setup-migration` |
| 5. Figma error handling | **Retry loop:** max 3 attempts with credential re-entry |
| 6. File path strategy | **Convention-based:** auto-generate, store explicit |
| 7. Debug cleanup | **Clean init.ts + sync-cmd.ts, skip setup.ts** |
| 8. Schema reference | **Fixed path:** assume tokensrc.json in root |

---

## Next Steps

1. ✅ Specialist reviews answers
2. ⏳ Implement Phase 1 (core init flow)
3. ⏳ Create `setup-migration` command (Phase 2)
4. ⏳ Code cleanup + testing
