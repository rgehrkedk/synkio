# Task Breakdown: Enhance Init Command Configuration Generation

## Overview

This task list provides a strategic, sequential breakdown for enhancing the init command to generate complete, production-ready tokensrc.json configurations. The implementation fixes 7 critical bugs, adds comprehensive collection configuration, and provides an excellent first-impression experience.

**Total Phases:** 8
**Estimated Total Effort:** 24-32 hours
**Implementation Style:** Sequential phases with testing checkpoints

---

## Phase 1: Foundation & Bug Fixes

**Effort:** Medium (3-4 hours)
**Dependencies:** None

### Task Group 1.1: Critical Bug Fixes

- [x] **1.1.1: Fix Figma API accessToken Parameter** (File: `packages/core/src/cli/commands/init.ts:159`)
  - Add `accessToken: accessToken || undefined` to fetchFigmaData call
  - Verify token is passed correctly from user input
  - Test with valid and invalid tokens
  - **Acceptance:** User-entered token is used for API authentication
  - **Reference:** Bug #1 in BUGS_AND_FIXES.md

- [x] **1.1.2: Implement Retry Loop with Readline Reset** (File: `packages/core/src/cli/commands/init.ts:~145-180`)
  - Replace single try/catch with while loop (max 3 attempts)
  - Add attempt counter to spinner message
  - Close and recreate readline interface after each spinner failure
  - Prompt user to retry or cancel after failures
  - **Acceptance:** Users can retry on connection failures without restart
  - **Reference:** spec.md lines 31-79, Bug #3 in BUGS_AND_FIXES.md
  - **Code Pattern:**
    ```typescript
    while (!success && attempt < maxAttempts) {
      // spinner logic
      if (attempt < maxAttempts) {
        rl.close();
        rl = createPrompt();
        const retry = await askYesNo(rl, 'Retry connection?', true);
      }
    }
    ```

- [x] **1.1.3: Remove Debug Statements and Clean Imports** (File: `packages/core/src/cli/commands/init.ts`)
  - Remove all `[DEBUG]` console.log statements (lines ~900-902)
  - Remove unused imports: `backupBaseline`, `getBaselinePath` (if present)
  - Verify no `any` types are used
  - **Acceptance:** Clean code with no debug logs or unused imports
  - **Reference:** spec.md line 446, requirements.md lines 673-674

### Task Group 1.2: Package Configuration Updates

- [x] **1.2.1: Update package.json for Public NPM** (File: `packages/core/package.json`)
  - Check @synkio/core is available on npmjs.org
  - Change name from `@rgehrkedk/synkio-core` to `@synkio/core`
  - Update publishConfig:
    ```json
    {
      "access": "public",
      "registry": "https://registry.npmjs.org"
    }
    ```
  - Add `schemas` directory to `files` array
  - Update version to `1.0.0`
  - **Acceptance:** Package ready for public npm publish
  - **Reference:** spec.md lines 1362-1408, requirements.md lines 60-82

**Phase 1 Checkpoint:**
- [x] All bug fixes tested manually
- [x] Package.json validates correctly
- [x] No TypeScript errors
- [x] Code is clean and professional

---

## Phase 2: Early Detection & Smart Defaults

**Effort:** Small (1-2 hours)
**Dependencies:** Phase 1 complete

### Task Group 2.1: Project Detection Before Figma Connection

- [x] **2.1.1: Move detectProject() Call Early** (File: `packages/core/src/cli/commands/init.ts:~125`)
  - Import `detectProject` from `../../detect/index.js`
  - Call `detectProject()` BEFORE Figma connection prompts
  - Store detection results in variable for later use
  - **Acceptance:** Project detection happens first in flow
  - **Reference:** spec.md lines 15-30, requirements.md lines 369-412

- [x] **2.1.2: Display Detection Results to User** (File: `packages/core/src/cli/commands/init.ts:~130`)
  - Format and show Style Dictionary version (if found)
  - Show config path and detected build command
  - Show detected token directories
  - Use visual separators for clarity
  - **Acceptance:** User sees what was auto-detected
  - **Reference:** spec.md lines 387-394
  - **Example Output:**
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Step 1: Project Detection
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ✓ Style Dictionary v4 detected
      Config: style-dictionary.config.mjs
      Build: npm run tokens:build
    ```

- [x] **2.1.3: Add Opening Welcome Message** (File: `packages/core/src/cli/commands/init.ts:~100`)
  - Update welcome message with realistic expectations
  - Mention 12-20 questions, 5-10 minutes
  - List what user needs (Figma URL, token)
  - Use formatInfo() for consistent styling
  - **Acceptance:** Users have realistic expectations before starting
  - **Reference:** spec.md lines 407-416, Bug #3 fix

**Phase 2 Checkpoint:**
- [x] Detection runs before Figma connection
- [x] Results displayed clearly to user
- [x] Welcome message sets correct expectations

---

## Phase 3: Filename Sanitization Utilities

**Effort:** Small (1-2 hours)
**Dependencies:** Phase 2 complete

### Task Group 3.1: Create Sanitization Function

- [x] **3.1.1: Implement sanitizeForFilename()** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - Handle special characters (/, \, :, *, ?, ", <, >, |)
  - Replace spaces with hyphens
  - Remove parentheses and brackets
  - Convert to lowercase
  - Handle Windows reserved names (con, prn, aux, nul, com1-9, lpt1-9)
  - Add fallback to 'default' if empty
  - Add comprehensive JSDoc
  - **Acceptance:** Unsafe filenames converted to safe ones
  - **Reference:** spec.md lines 156-226, requirements.md lines 275-321
  - **Implementation:** See spec.md lines 157-195 for exact logic

- [x] **3.1.2: Write Unit Tests for Sanitization** (File: `packages/core/src/cli/commands/__tests__/init.test.ts`, new file)
  - Test special characters: "Dark / High Contrast" → "dark-high-contrast"
  - Test Windows reserved: "con" → "_con"
  - Test path traversal: "../secrets" → "secrets"
  - Test empty/whitespace: "   " → "default"
  - Test consecutive hyphens: "foo---bar" → "foo-bar"
  - Limit to 6-8 focused tests
  - **Acceptance:** All sanitization edge cases covered
  - **Reference:** spec.md lines 849-877

**Phase 3 Checkpoint:**
- [x] sanitizeForFilename() function complete
- [x] Unit tests pass (6-8 tests)
- [x] JSDoc documentation clear

---

## Phase 4: Collection Analysis & Configuration

**Effort:** Large (6-8 hours)
**Dependencies:** Phase 3 complete

### Task Group 4.1: Collection Extraction & Analysis

- [x] **4.1.1: Add Collection Analysis After Figma Fetch** (File: `packages/core/src/cli/commands/init.ts:~180`)
  - Import `extractCollections`, `analyzeCollections` from `../../tokens/index.js`
  - After successful fetchFigmaData, call extractCollections(fetchedData)
  - Call analyzeCollections(collections) to get CollectionInfo[]
  - Store collectionsInfo for later use
  - **Acceptance:** Collections extracted and analyzed correctly
  - **Reference:** spec.md lines 86-137, requirements.md lines 459-505

- [x] **4.1.2: Handle Edge Case - Zero Collections Found** (File: `packages/core/src/cli/commands/init.ts:~185`)
  - Check if collectionsInfo.length === 0
  - Show warning about no collections found
  - Prompt user to continue or exit
  - If continue, save minimal config
  - **Acceptance:** Graceful handling of files without collections
  - **Reference:** spec.md lines 731-750

### Task Group 4.2: Strategy Determination & Path Generation

- [x] **4.2.1: Implement determineAvailableStrategies()** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - If collection has multiple modes (>1): FORCE byMode only
  - If collection has single mode: Offer byGroup, flat, skip
  - Return array of strategy choices with descriptions
  - **Acceptance:** Correct strategies offered based on collection structure
  - **Reference:** spec.md lines 138-144

- [x] **4.2.2: Implement generateFilePaths()** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - Accept collectionName, strategy, keys (modes or groups)
  - Apply sanitizeForFilename to all names
  - Generate baseDir: `tokens/{sanitized-collection}`
  - For byMode/byGroup: Each key gets own file
  - For flat: All keys map to single file
  - Return { output: string, files: Record<string, string> }
  - Add comprehensive JSDoc
  - **Acceptance:** Correct file paths generated for all strategies
  - **Reference:** spec.md lines 199-247, requirements.md lines 726-753
  - **Implementation:** See spec.md lines 199-225 for exact logic

- [x] **4.2.3: Write Unit Tests for Path Generation** (File: `packages/core/src/cli/commands/__tests__/init.test.ts`)
  - Test byMode strategy with 2 modes
  - Test byGroup strategy with 3 groups
  - Test flat strategy
  - Test sanitization in paths
  - Limit to 6-8 focused tests
  - **Acceptance:** All path generation scenarios covered
  - **Reference:** spec.md lines 879-915

### Task Group 4.3: Interactive Collection Configuration Loop

- [x] **4.3.1: Create configureCollection() Function** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - Display collection name with visual separator
  - Show modes with counts
  - Show groups (from first mode) with counts
  - Get available strategies from determineAvailableStrategies()
  - Prompt user for strategy choice
  - If skip, return null
  - Generate paths using generateFilePaths()
  - Return CollectionSplitConfig object
  - **Acceptance:** Single collection configured interactively
  - **Reference:** spec.md lines 94-137, requirements.md lines 420-446

- [x] **4.3.2: Implement Collection Configuration Loop** (File: `packages/core/src/cli/commands/init.ts:~200`)
  - Add section header: "Step 3: Collection Configuration"
  - Show collection count: `Found ${collectionsInfo.length} collection(s)`
  - For each collection in collectionsInfo:
    - Call configureCollection(rl, info)
    - If not null, add to config.split object
  - Track configured collections
  - **Acceptance:** All collections configured or skipped
  - **Reference:** spec.md lines 417-440

- [x] **4.3.3: Validate At Least One Collection Configured** (File: `packages/core/src/cli/commands/init.ts:~230`)
  - After loop, check if config.split is empty
  - If empty, show error and prompt to restart
  - **Acceptance:** Cannot proceed without at least one collection
  - **Reference:** spec.md lines 777-796

- [x] **4.3.4: Add Path Conflict Detection** (File: `packages/core/src/cli/commands/init.ts:~235`)
  - Track all file paths in Set
  - Check for duplicates across collections
  - Warn user if conflicts found
  - **Acceptance:** Users warned about path conflicts
  - **Reference:** spec.md lines 228-246

**Phase 4 Checkpoint:**
- [x] Collections analyzed correctly
- [x] Strategies determined appropriately
- [x] File paths generated safely
- [x] Interactive loop works smoothly
- [x] Unit tests pass (12-16 total)
- [x] Edge cases handled gracefully

---

## Phase 5: Style Dictionary Integration

**Effort:** Small (1-2 hours)
**Dependencies:** Phase 4 complete

### Task Group 5.1: Build Configuration

- [x] **5.1.1: Populate build.styleDictionary Section** (File: `packages/core/src/cli/commands/init.ts:~250`)
  - Use detection results from Phase 2
  - If Style Dictionary found:
    - Set build.command from detected scripts
    - Populate build.styleDictionary object with enabled, config, version
  - If not found:
    - Prompt user for build command (optional)
    - If provided, add build.command only
  - **Acceptance:** Style Dictionary config auto-populated when detected
  - **Reference:** spec.md lines 250-287, requirements.md lines 508-540

**Phase 5 Checkpoint:**
- [x] Build config populated correctly
- [x] Detection results used appropriately
- [x] Manual build command works when SD not found

---

## Phase 6: JSON Schema Creation & Integration

**Effort:** Medium (3-4 hours)
**Dependencies:** Phase 5 complete

### Task Group 6.1: Create JSON Schema File

- [x] **6.1.1: Create tokensrc.schema.json** (File: `packages/core/schemas/tokensrc.schema.json`, new file)
  - Use JSON Schema draft-07
  - Set $id to unpkg.com URL
  - Define root object with required properties: version, figma, paths
  - Create definitions for all nested types:
    - FigmaConfig
    - PathsConfig
    - CollectionSplitConfig
    - BuildConfig
    - StyleDictionaryConfig
    - MigrationConfig
    - PlatformConfig
    - TransformConfig
  - Add descriptions for IDE tooltips
  - Add examples for common patterns
  - Add enum values for constrained fields
  - **Acceptance:** Complete schema matching TokensConfig interface
  - **Reference:** spec.md lines 1074-1341, requirements.md lines 559-566
  - **Implementation:** See spec.md lines 1075-1341 for exact schema structure

- [x] **6.1.2: Validate Schema Against Example Configs** (Local testing)
  - Install ajv-cli for validation
  - Test schema against generated configs
  - Fix validation errors
  - **Acceptance:** Schema validates real configs successfully
  - **Reference:** spec.md lines 1345-1359

### Task Group 6.2: Schema Integration

- [x] **6.2.1: Add Schema Reference to Generated Configs** (File: `packages/core/src/cli/commands/init.ts:~260`)
  - Always add `$schema` property to config object
  - Use URL: `https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json`
  - Place as first property in config
  - **Acceptance:** All generated configs include schema reference
  - **Reference:** spec.md lines 299-305

- [x] **6.2.2: Test Schema Autocomplete in VS Code** (Manual testing)
  - Generate a config with init
  - Open tokensrc.json in VS Code
  - Verify autocomplete appears
  - Check tooltip descriptions
  - Test validation errors for invalid values
  - **Acceptance:** IDE autocomplete and validation work
  - **Reference:** spec.md lines 1621-1629

**Phase 6 Checkpoint:**
- [x] Schema file created and complete
- [x] Schema validates against real configs
- [x] Autocomplete works in VS Code
- [x] Tooltips provide helpful context

---

## Phase 7: Optional Migration Configuration

**Effort:** Medium (3-4 hours)
**Dependencies:** Phase 6 complete

### Task Group 7.1: Migration Helper Functions

- [x] **7.1.1: Port generateStripSegments()** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - Port logic from setup.ts lines 119-136
  - Accept collectionsInfo as parameter
  - Extract collection names (sanitized)
  - Extract mode names from all collections (sanitized)
  - Add "value" as common segment
  - Return array of unique segments
  - Add JSDoc documentation
  - **Acceptance:** Strip segments generated from collections
  - **Reference:** spec.md lines 372-395, requirements.md lines 613-621

- [x] **7.1.2: Write Unit Tests for generateStripSegments()** (File: `packages/core/src/cli/commands/__tests__/init.test.ts`)
  - Test with single collection
  - Test with multiple collections
  - Test with sanitized names
  - Limit to 4-6 focused tests
  - **Acceptance:** Strip segment generation tested
  - **Reference:** spec.md lines 917-953

### Task Group 7.2: Migration Configuration Prompts

- [x] **7.2.1: Add Migration Prompt at End of Flow** (File: `packages/core/src/cli/commands/init.ts:~270`)
  - After saving main config, show success message
  - Prompt: "Optional: Configure automatic migration for breaking token changes?"
  - Default to "No" for easy skip
  - If No, skip to final success message
  - **Acceptance:** Migration is clearly optional
  - **Reference:** spec.md lines 313-370, requirements.md lines 568-628

- [x] **7.2.2: Implement Migration Platform Selection** (File: `packages/core/src/cli/commands/init.ts:~275`)
  - Import `askMultipleChoiceToggle`, `PLATFORM_CHOICES`, `createPlatformsConfig` from adapters
  - If user opts in, show explanation of migration
  - Ask which platforms to configure (multi-select)
  - Default to CSS platform selected
  - **Acceptance:** User can select multiple platforms
  - **Reference:** spec.md lines 342-358

- [x] **7.2.3: Generate and Apply Migration Config** (File: `packages/core/src/cli/commands/init.ts:~280`)
  - Generate stripSegments from collectionsInfo
  - Call createPlatformsConfig(selectedPlatforms)
  - Apply stripSegments to all platform configs
  - Create migration config with autoApply: false
  - Add migration section to config object
  - Save updated config
  - Show success message
  - **Acceptance:** Complete migration config generated
  - **Reference:** spec.md lines 350-369

**Phase 7 Checkpoint:**
- [x] Migration is optional (default: No)
- [x] Strip segments generated correctly
- [x] Platform configs created properly
- [x] Generated migration config is functional
- [x] Unit tests pass (16-22 total)

---

## Phase 8: User Experience & Polish

**Effort:** Medium (3-4 hours)
**Dependencies:** Phase 7 complete

### Task Group 8.1: Progress Indication & Messaging

- [x] **8.1.1: Add Section Headers Throughout Flow** (File: `packages/core/src/cli/commands/init.ts`)
  - Add visual separators using `━` characters
  - Number each major step (Step 1, Step 2, etc.)
  - Sections: Project Detection, Figma Connection, Collection Configuration, Migration (optional)
  - Use consistent formatting
  - **Acceptance:** Clear visual structure throughout flow
  - **Reference:** spec.md lines 398-440

- [x] **8.1.2: Implement Helpful Error Messages** (File: `packages/core/src/cli/commands/init.ts`, new function)
  - Create getHelpfulErrorMessage(error) function
  - Map common errors to user-friendly messages:
    - 403/Unauthorized → Check access token
    - 404/Not Found → Verify file ID
    - Network errors → Check connection
  - Return actionable next steps
  - **Acceptance:** Users understand errors and know how to fix them
  - **Reference:** spec.md lines 478-510, requirements.md lines 639-647

- [x] **8.1.3: Add JSDoc Comments to All Functions** (File: `packages/core/src/cli/commands/init.ts`)
  - Document all new functions with JSDoc
  - Include @param, @returns, @example tags
  - Explain edge cases and special behavior
  - Reference existing patterns where applicable
  - **Acceptance:** All public functions documented
  - **Reference:** spec.md lines 453-475

### Task Group 8.2: Final Testing & Validation

- [x] **8.2.1: Manual Testing Checklist** (Local testing)
  - Run init with valid Figma file (2-3 collections)
  - Test retry with invalid token (verify readline reset)
  - Test retry with invalid file ID
  - Test with no Style Dictionary in project
  - Test with Style Dictionary v4 config
  - Test with existing tokensrc.json (verify overwrite prompt)
  - Test collection with special characters: "Dark / High Contrast"
  - Test collection named "con" (Windows reserved)
  - Test skipping a collection
  - Verify generated config with `synkio sync`
  - Test migration: Skip (say No)
  - Test migration: Configure CSS platform
  - Verify schema autocomplete in VS Code
  - **Acceptance:** All scenarios work correctly
  - **Reference:** spec.md lines 1035-1057

- [x] **8.2.2: Integration Test for Full Flow** (File: `packages/core/src/cli/commands/__tests__/init.test.ts`)
  - Mock Figma API responses
  - Simulate user inputs
  - Test complete init flow end-to-end
  - Verify generated config structure
  - Test retry logic
  - Test migration configuration
  - Limit to 6-8 focused integration tests
  - **Acceptance:** Critical flows covered by tests
  - **Reference:** spec.md lines 956-1032

- [x] **8.2.3: Run All Tests and Verify Passing** (Local testing)
  - Run complete test suite
  - Target: ~22-30 total tests passing
  - Fix any failures
  - Ensure no regressions
  - **Acceptance:** All tests pass, no errors
  - **Reference:** Testing guidelines from test-writing.md

### Task Group 8.3: Documentation Updates

- [x] **8.3.1: Update CLI Help Text** (File: `packages/core/src/cli/commands/init.ts`)
  - Update command description
  - Add help text with realistic info (12-20 questions)
  - Include examples
  - List requirements (Figma URL, token)
  - **Acceptance:** Help text is accurate and helpful
  - **Reference:** spec.md lines 1640-1671

- [x] **8.3.2: Create CHANGELOG Entry** (File: `packages/core/CHANGELOG.md`)
  - Document all changes in v1.0.0 release
  - List bug fixes (7 critical bugs)
  - List new features (collection config, schema, migration)
  - List breaking changes (package name)
  - **Acceptance:** Complete changelog for release
  - **Reference:** Implementation notes in spec.md

**Phase 8 Checkpoint:**
- [x] All sections have clear headers
- [x] Error messages are helpful
- [x] All functions documented
- [x] Manual testing complete
- [x] Integration tests pass (22-30 total tests)
- [x] Help text updated
- [x] Documentation complete

---

## Final Validation Checklist

Before marking this spec complete, verify:

### Functional Completeness
- [x] Generated tokensrc.json works immediately with `synkio sync`
- [x] All collections configured with explicit file paths
- [x] Style Dictionary auto-detected and configured
- [x] Migration optionally configured (if user chooses)
- [x] Schema provides IDE autocomplete
- [x] All 7 bugs from BUGS_AND_FIXES.md fixed

### User Experience
- [x] Clear progress indication (section headers)
- [x] Informative prompts with context
- [x] Smart defaults based on detection
- [x] Graceful error handling with retry
- [x] Realistic documentation (12-20 prompts)
- [x] Migration clearly optional

### Code Quality
- [x] Zero DEBUG statements
- [x] Zero unused imports
- [x] No `any` types
- [x] JSDoc on all public functions
- [x] 22-30 tests covering critical paths

### Documentation
- [x] CLI help text accurate
- [x] Schema has descriptions
- [x] Error messages actionable
- [x] CHANGELOG complete

---

## Effort Summary

| Phase | Description | Effort | Tasks |
|-------|-------------|--------|-------|
| 1 | Foundation & Bug Fixes | 3-4 hours | 4 |
| 2 | Early Detection | 1-2 hours | 3 |
| 3 | Sanitization | 1-2 hours | 2 |
| 4 | Collection Configuration | 6-8 hours | 9 |
| 5 | Style Dictionary | 1-2 hours | 1 |
| 6 | Schema Creation | 3-4 hours | 4 |
| 7 | Migration Config | 3-4 hours | 5 |
| 8 | UX & Polish | 3-4 hours | 8 |
| **Total** | **All Phases** | **22-30 hours** | **36 tasks** |

---

## Critical Dependencies

**Sequential Flow (must follow order):**
1. Phase 1 must complete first (bug fixes, package setup)
2. Phase 2 enables smart defaults for later phases
3. Phase 3 required before Phase 4 (sanitization used in path generation)
4. Phase 4 must complete before Phase 7 (collections needed for strip segments)
5. Phase 6 can run in parallel with Phase 5 if needed
6. Phase 7 depends on Phase 4 (uses collectionsInfo)
7. Phase 8 is final polish (depends on all previous phases)

**Key Technical Dependencies:**
- sanitizeForFilename() → generateFilePaths()
- detectProject() results → build.styleDictionary population
- collectionsInfo → generateStripSegments()
- All phases → Phase 8 testing

---

## Notes for Implementation

### Testing Strategy
- Write 2-8 focused tests per task group during development
- Run ONLY newly written tests during development phases
- Run full test suite only in Phase 8.2.3
- Target 22-30 total tests for entire spec
- Focus on critical paths, skip exhaustive edge case testing

### User Experience Focus
- Every prompt should have context and examples
- Show what was detected before asking questions
- Use visual separators for section clarity
- Provide progress indication throughout
- Make migration clearly optional (default: No)

### Code Quality Standards
- Follow error-handling.md: User-friendly messages, fail fast
- Follow test-writing.md: Minimal tests, core flows only
- Use TypeScript strict mode (no `any` types)
- Add JSDoc to all public functions
- Clean up debug logs and unused imports

### Risk Mitigation
- Test retry logic extensively (common failure point)
- Validate filename sanitization with real Figma names
- Ensure migration is truly optional (not forced)
- Test schema URL works after npm publish
- Verify backward compatibility with existing configs

---

**End of Task Breakdown**

This task list provides a clear, sequential path to implementing the enhanced init command. Each phase builds on the previous one, with testing checkpoints to ensure quality at every stage.
