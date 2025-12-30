# Baseline Format Unification Spec

> Goal: Make `export-baseline.json` (Code → Figma) structurally identical to `baseline.json` (Figma → Code) so comparison is trivial.

## Current State

### baseline.json (Figma → Code)

```json
{
  "baseline": {
    "VariableID:24963:74561:brand.eboks": {
      "variableId": "VariableID:24963:74561",
      "collectionId": "VariableCollectionId:8407:177350",
      "modeId": "8407:0",
      "collection": "brand",
      "mode": "eboks",
      "path": "colors.neutral.white",
      "value": "#ffffff",
      "type": "color",
      "scopes": ["ALL_SCOPES"],
      "codeSyntax": {}
    }
  },
  "styles": {
    "S:9e53e266eaaa43a5351b8dacc46324ba9f25706b,:paint": {
      "styleId": "S:9e53e266eaaa43a5351b8dacc46324ba9f25706b,",
      "type": "paint",
      "path": "components.button.bg.primary.default",
      "value": {
        "$type": "gradient",
        "$value": { "gradientType": "linear", "stops": [...] }
      }
    }
  },
  "metadata": {
    "syncedAt": "2025-12-28T17:27:01.431Z"
  }
}
```

### export-baseline.json (Code → Figma) - CURRENT

```json
{
  "baseline": {
    "VariableID:8407:177359:brand.eboks": {
      "collection": "brand",
      "mode": "eboks",
      "path": "colors.neutral.50",
      "value": "#f9f8f7",
      "type": "color",
      "variableId": "VariableID:8407:177359"
    },
    "color.components.button.bg.primary.default:brand.eboks": {
      "collection": "brand",
      "mode": "eboks",
      "path": "color.components.button.bg.primary.default",
      "value": { "gradientType": "linear", "stops": [...] },
      "type": "gradient"
    }
  },
  "metadata": {
    "syncedAt": "2025-12-28T18:33:01.484Z",
    "source": "export"
  }
}
```

## Problems

| Issue | baseline.json | export-baseline.json |
|-------|--------------|---------------------|
| Styles section | Separate `styles` object | Mixed into `baseline` |
| Style paths | `components.button.bg.primary.default` | `color.components.button.bg.primary.default` (has group prefix) |
| Style types | `paint`, `effect`, `text` | `gradient`, `shadow`, `blur`, `typography` |
| Style value format | `{ "$type": "gradient", "$value": {...} }` | `{ "gradientType": "linear", ... }` (flat) |
| Style IDs | `styleId` field | No `styleId` |
| Variable fields | Has `collectionId`, `modeId`, `scopes`, `codeSyntax` | Missing these fields |

## Target Format

`export-baseline.json` should match `baseline.json` exactly:

```json
{
  "baseline": {
    "VariableID:8407:177359:brand.eboks": {
      "variableId": "VariableID:8407:177359",
      "collectionId": "VariableCollectionId:8407:177350",  // from baseline.json lookup
      "modeId": "8407:0",                                   // from baseline.json lookup
      "collection": "brand",
      "mode": "eboks",
      "path": "colors.neutral.50",
      "value": "#f9f8f7",
      "type": "color",
      "scopes": ["ALL_SCOPES"],                             // from baseline.json lookup
      "codeSyntax": {}                                      // from baseline.json lookup
    }
  },
  "styles": {
    "S:9e53e266eaaa43a5351b8dacc46324ba9f25706b,:paint": {
      "styleId": "S:9e53e266eaaa43a5351b8dacc46324ba9f25706b,",
      "type": "paint",                                      // mapped from "gradient"
      "path": "components.button.bg.primary.default",       // stripped prefix
      "value": {
        "$type": "gradient",
        "$value": { "gradientType": "linear", "stops": [...] }
      }
    }
  },
  "metadata": {
    "syncedAt": "2025-12-28T18:33:01.484Z",
    "source": "export"
  }
}
```

## Required Changes to export-baseline.ts

### 1. Separate Styles from Variables

Detect style-type tokens and put them in `styles` section:

```typescript
const STYLE_TYPES = new Set(['gradient', 'shadow', 'blur', 'typography']);

function isStyleToken(token: ParsedToken): boolean {
  return STYLE_TYPES.has(token.type);
}
```

### 2. Strip Merge Group Prefix from Style Paths

When config has `mergeInto.group`, the token file has that group as a prefix. Strip it:

```typescript
// Config: { paint: { mergeInto: { collection: "brand", group: "color" } } }
// Token path in file: color.components.button.bg.primary.default
// Desired style path: components.button.bg.primary.default

function getStylePath(token: ParsedToken, config: SynkioConfig): string {
  const styleConfig = findStyleConfigForToken(token, config);
  if (styleConfig?.mergeInto?.group) {
    const prefix = styleConfig.mergeInto.group + '.';
    if (token.path.startsWith(prefix)) {
      return token.path.slice(prefix.length);
    }
  }
  return token.path;
}
```

### 3. Map DTCG Types to Figma Style Types

```typescript
function mapToFigmaStyleType(dtcgType: string): 'paint' | 'effect' | 'text' {
  switch (dtcgType) {
    case 'gradient':
      return 'paint';
    case 'shadow':
    case 'blur':
      return 'effect';
    case 'typography':
      return 'text';
    default:
      throw new Error(`Unknown style type: ${dtcgType}`);
  }
}
```

### 4. Wrap Style Values in DTCG Format

```typescript
function wrapStyleValue(value: unknown, type: string): { $type: string; $value: unknown } {
  return {
    $type: type,  // 'gradient', 'shadow', etc.
    $value: value
  };
}
```

### 5. Lookup Style IDs from baseline.json

```typescript
function getStyleId(path: string, type: string, baseline: BaselineData): string | undefined {
  if (!baseline.styles) return undefined;

  for (const style of Object.values(baseline.styles)) {
    if (style.path === path && style.type === mapToFigmaStyleType(type)) {
      return style.styleId;
    }
  }
  return undefined;
}
```

### 6. Enrich Variables with Full Metadata

Already partially done. Extend to include `collectionId`, `modeId`, `scopes`, `codeSyntax`:

```typescript
function enrichVariableFromBaseline(
  token: ParsedToken,
  collection: string,
  mode: string,
  baselineLookup: Map<string, BaselineEntry>
): Partial<BaselineEntry> {
  const key = buildPathLookupKey(token.path, collection, mode);
  const existing = baselineLookup.get(key);

  if (existing) {
    return {
      variableId: existing.variableId,
      collectionId: existing.collectionId,
      modeId: existing.modeId,
      scopes: existing.scopes,
      codeSyntax: existing.codeSyntax,
    };
  }
  return {};
}
```

## Implementation Steps

1. **Update baseline-builder.ts**
   - Add `styles` section to `ExportBaseline` interface
   - Separate style tokens from variable tokens in `buildExportBaseline()`
   - Build style entries with correct format

2. **Update export-baseline.ts**
   - Load config to determine merge group prefixes
   - Pass config to baseline builder
   - Load existing baseline.json for ID lookups (already done for variableId)
   - Extend lookups to include styleId, collectionId, modeId, scopes, codeSyntax

3. **Update types**
   - Ensure `ExportBaseline` matches `BaselineData` structure exactly
   - Add `styles` to export types

4. **Simplify plugin comparison**
   - Remove `compareHybrid` complexity
   - Remove `compareCrossStyleEntries`
   - Remove `stripStyleGroupPrefix`, `mapToFigmaStyleType`, `isStyleEntry`
   - Use simple `compareBaselines` for both directions

## Files to Modify

| File | Changes |
|------|---------|
| `packages/cli/src/core/export/baseline-builder.ts` | Add styles section, type mapping, value wrapping |
| `packages/cli/src/cli/commands/export-baseline.ts` | Pass config, strip merge prefixes, lookup style IDs |
| `packages/cli/src/types/index.ts` | Ensure export types match baseline types |
| `packages/figma-plugin/synkio-v2/src/lib/compare.ts` | Remove hybrid comparison, simplify to single `compareBaselines` |
| `packages/figma-plugin/synkio-v2/src/code.ts` | Use `compareBaselines` instead of `compareHybrid` |

## Backup Location

```
synkio/backup/synkio-v2-backup-YYYYMMDD-HHMMSS/
```

## Success Criteria

After implementation:
1. `jq 'keys' export-baseline.json` returns `["baseline", "metadata", "styles"]`
2. Style entries in `styles` section have `styleId`, `type` (paint/effect/text), `path` (no prefix), `value` (wrapped in $type/$value)
3. Variable entries in `baseline` have all fields: `variableId`, `collectionId`, `modeId`, `collection`, `mode`, `path`, `value`, `type`, `scopes`, `codeSyntax`
4. Plugin uses single `compareBaselines()` function for both Figma→Code and Code→Figma comparisons
5. Rename detection works correctly in both directions
