# Token Mapping for Precise Migration

## Problem

Current migration uses substring matching on token names, which causes false positives:
- `--color-brand-primary` incorrectly matches `--color-brand-primary-hover`
- Similar issues across all platforms (SCSS, JS, Swift, Kotlin)

## Solution

Use Figma Variable ID as the stable identifier to create a mapping between:
1. Variable ID (never changes)
2. JSON token path
3. Platform-specific output names

## Architecture

### Token Map File (`token-map.json`)

Generated during Style Dictionary build, stored alongside other data files.

```json
{
  "$metadata": {
    "generatedAt": "2025-12-07T12:00:00Z",
    "version": "1.0.0"
  },
  "tokens": {
    "VariableID:4:157": {
      "path": "color.brand.primary",
      "outputs": {
        "css": "--color-brand-primary",
        "scss": "$color-brand-primary",
        "js": "colorBrandPrimary",
        "ts": "colorBrandPrimary",
        "swift": "ColorBrandPrimary",
        "kotlin": "colorBrandPrimary"
      }
    }
  }
}
```

### Generation Flow

```
synkio sync
    ↓
Fetch Figma → baseline.json (contains variableId per token)
    ↓
Split tokens → tokens/*.json (DTCG format with $extensions.variableId)
    ↓
Style Dictionary build
    ↓
Custom SD action: generateTokenMap()
    ↓
token-map.json (maps variableId → all platform outputs)
```

### Migration Flow

```
synkio sync (with breaking changes)
    ↓
Load previous token-map.json (from before rename)
    ↓
Detect path changes by variableId
    ↓
For each changed token:
  - Look up OLD output name from previous map
  - Generate NEW output name using same transform rules
  - Create precise replacement: oldOutput → newOutput
    ↓
Scan files using EXACT string match (no regex needed)
    ↓
Apply replacements
```

## Implementation Tasks

### Phase 1: Token Map Generation

1. **Extend baseline.json structure**
   - Already contains variableId per entry ✓

2. **Add variableId to split token files**
   - Store in `$extensions.com.synkio.variableId`
   - DTCG-compliant extension format

3. **Create Style Dictionary action**
   - Hook into SD build process
   - Collect all tokens with their variableIds
   - Generate output names for each platform
   - Write token-map.json

4. **Add token-map.json path to config**
   - `paths.tokenMap: ".figma/data/token-map.json"`

### Phase 2: Migration Using Token Map

1. **Load token map during sync**
   - Read previous token-map.json before applying changes

2. **Update migration logic**
   - Use variableId to find exact old output name
   - Generate new output name
   - Replace buildReplacements() with map-based approach

3. **Handle first sync**
   - No previous map = skip migration (nothing to migrate)

### Phase 3: Platform Transform Utilities

Create pure functions that generate output names:

```typescript
function getCssVariableName(path: string, config: PlatformConfig): string
function getScssVariableName(path: string, config: PlatformConfig): string
function getJsPropertyPath(path: string, config: PlatformConfig): string
function getSwiftPropertyName(path: string, config: PlatformConfig): string
function getKotlinPropertyName(path: string, config: PlatformConfig): string
```

These mirror what Style Dictionary does, ensuring consistency.

## File Changes

### New Files
- `src/tokens/token-map.ts` - Token map generation and loading
- `src/style-dictionary/actions/token-map-action.ts` - SD action for map generation

### Modified Files
- `src/tokens/split.ts` - Add variableId to output tokens
- `src/tokens/migrate.ts` - Use token map for precise matching
- `src/types/config.ts` - Add tokenMap path
- `src/files/paths.ts` - Add getTokenMapPath()

## Benefits

1. **100% accurate matching** - No false positives
2. **Platform agnostic** - Works for any output format
3. **Future proof** - New platforms just add to outputs map
4. **Debuggable** - token-map.json is human-readable
5. **Versioned** - Map tracks which outputs existed at each point

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SD build doesn't run | Warn user if token-map.json is stale |
| Custom SD config | Provide utilities to match user's transforms |
| Large token sets | Lazy load, only map changed tokens |

## Success Criteria

- [ ] `--color-brand-primary` does NOT match `--color-brand-primary-hover`
- [ ] Migration works across CSS, SCSS, JS, TS, Swift, Kotlin
- [ ] Token map generated on every SD build
- [ ] Migration uses map when available, falls back to current regex with warning
