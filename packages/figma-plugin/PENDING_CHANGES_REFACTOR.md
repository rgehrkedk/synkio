# Pending Changes Refactor - RESOLVED

## Original Problem

The Figma plugin's "Pending Changes" view was conflating two different workflows:
1. **Figma → Code** ("Since Last Sync") - What changed in Figma since the last sync
2. **Code → Figma** ("Compare with Code") - What's different between token files and Figma

This caused confusion because:
- Both used the same `compareSnapshots()` function
- Mode detection was silent (based on `variableId` presence)
- Renames were detected differently per workflow

## Root Cause Found

The `synkio sync` command has `tokens.includeVariableId` defaulting to `false`, so token files don't include `$extensions.com.figma.variableId`. When `export-baseline` read these files, there was no `variableId` to include.

## Solution Implemented

**CLI Fix (export-baseline.ts):**
- When token files lack `variableId`, the command now reads from `baseline.json`
- It enriches tokens with `variableId` by matching `path:collection.mode`
- Output now includes proper Figma IDs for ID-based comparison

**Result:**
- Both workflows can now use ID-based comparison when baseline.json exists
- The plugin can properly detect renames in both directions
- No need for complex two-tab UI separation

## What Changed

### CLI Changes
- `packages/cli/src/cli/commands/export-baseline.ts`:
  - Added `buildPathLookupKey()` for creating lookup keys
  - Added `buildBaselineLookupMap()` to create variableId lookup from baseline.json
  - Added `enrichTokensWithVariableIds()` to enrich parsed tokens
  - Added `hasAnyVariableIds()` to detect if enrichment is needed
  - Integrated enrichment into export flow with user feedback

### Plugin Changes (from agents)
- `packages/figma-plugin/synkio-ui/lib/types.ts`: Added `SyncBaseline` and `CodeBaseline` interfaces
- `packages/figma-plugin/synkio-ui/lib/compare.ts`: Added explicit key builders and value normalization
- `packages/figma-plugin/synkio-ui/code.ts`: Added new baseline storage functions
- `packages/figma-plugin/synkio-ui/ui.html/ui.ts`: Added tab UI for viewing different change types

## Testing

Run export-baseline in starter-app:
```bash
cd examples/starter-app
node ../../packages/cli/dist/cli/bin.js export-baseline --verbose
```

Expected output:
```
✔ Baseline exported successfully!
  Enriched: 599 tokens with variableIds from baseline.json
```

Check export-baseline.json now has variableId keys:
```json
{
  "baseline": {
    "VariableID:8407:177359:brand.eboks": {
      "variableId": "VariableID:8407:177359",
      ...
    }
  }
}
```

## Future Improvements

1. Consider changing `tokens.includeVariableId` default to `true` for new projects
2. The plugin tab UI could show a unified view since both workflows now use IDs
3. Add warning when export-baseline can't find baseline.json for enrichment
