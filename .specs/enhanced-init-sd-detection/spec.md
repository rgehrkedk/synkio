# Enhanced Init Flow with SD Source Parsing

## Problem

Currently, synkio tries to run Style Dictionary builds directly using detected config files. This fails for:
1. Factory function configs (`export const getConfig = (brand, theme) => {...}`)
2. Complex multi-brand/theme setups with dynamic paths

## Solution

Parse the SD config `source` array to extract file path patterns, then:
1. Generate `tokens.collections` config with correct `dir` and `file` patterns
2. Detect and configure `build.script` instead of `build.styleDictionary.configFile`
3. Let the user's existing SD build pipeline handle the actual build

## SD Source Pattern Parsing

### Input (from SD config)

```typescript
source: [
  `./themeGenerator/raw/${brand}/brand.${brand}.tokens.json`,
  `./shared/globals.value.tokens.json`,
  `./shared/theme.${themeVariant}.tokens.json`,
],
```

### Parsing Logic

1. Extract source array from SD config (handle both static strings and template literals)
2. For each source path:
   - Identify collection name (e.g., `brand`, `globals`, `theme` from filename)
   - Identify mode pattern (e.g., `${brand}` → `{mode}`, or static like `value`)
   - Extract directory path
   - Extract file naming pattern

### Output (synkio config)

```json
{
  "tokens": {
    "collections": {
      "brand": {
        "dir": "./themeGenerator/raw/{mode}",
        "file": "brand.{mode}.tokens.json",
        "splitModes": true
      },
      "globals": {
        "dir": "./shared",
        "file": "globals.{mode}.tokens.json",
        "splitModes": false
      },
      "theme": {
        "dir": "./shared",
        "file": "theme.{mode}.tokens.json",
        "splitModes": true
      }
    }
  },
  "build": {
    "script": "npm run build:tokens"
  }
}
```

## Implementation

### 1. Enhanced Source Pattern Extraction (detect.ts)

```typescript
interface SDSourcePattern {
  collection: string;      // e.g., "brand"
  dir: string;            // e.g., "./themeGenerator/raw/{mode}"
  file: string;           // e.g., "brand.{mode}.tokens.json"
  hasDynamicMode: boolean; // true if has ${variable}
  rawPattern: string;      // original source string
}

function parseSDSourcePatterns(content: string): SDSourcePattern[] {
  // Match template literals: `./path/${var}/file.json`
  // Match static strings: './path/file.json' or "./path/file.json"

  // Extract all source patterns
  // Parse each into dir/file/collection/mode components
  // Replace ${variable} with {mode}
}
```

### 2. Build Script Detection (detect.ts)

```typescript
function detectBuildScript(pkgPath: string): string | null {
  const pkg = readJsonFile(pkgPath);
  const scripts = pkg?.scripts || {};

  // Look for common token build script names
  const candidates = [
    'build:tokens',
    'tokens:build',
    'build:style-dictionary',
    'sd:build',
    'tokens',
    'build:design-tokens'
  ];

  for (const name of candidates) {
    if (scripts[name]) return `npm run ${name}`;
  }

  return null;
}
```

### 3. Updated Init Flow (init.ts)

```typescript
async function initCommand() {
  // 1. Detect project, SD, get Figma URL

  // 2. Validate Figma connection

  // 3. NEW: Fetch collections from Figma
  const figmaClient = new FigmaClient({...});
  const rawData = await figmaClient.fetchData();
  const normalizedTokens = normalizePluginData(rawData);
  const collections = discoverCollectionsFromTokens(normalizedTokens);

  // 4. Display collections (with phantom mode filtering)
  console.log('Collections from Figma:');
  for (const col of collections) {
    console.log(`  - ${col.name} (${col.modes.length} modes: ${col.modes.join(', ')})`);
  }

  // 5. Parse SD source patterns (if SD detected)
  const sdPatterns = parseSDSourcePatterns(sdConfigContent);

  // 6. Match collections to SD patterns
  const collectionConfigs = matchCollectionsToPatterns(collections, sdPatterns);

  // 7. Detect build script
  const buildScript = detectBuildScript(pkgPath);

  // 8. Generate config
  const config = {
    tokens: {
      collections: collectionConfigs
    },
    build: buildScript ? { script: buildScript } : { css: { enabled: true } }
  };

  // 9. Write config
}
```

### 4. Sync Command - Run Build Script

```typescript
// In sync.ts, after writing token files:

if (config.build?.script) {
  spinner.text = `Running build script: ${config.build.script}`;
  try {
    execSync(config.build.script, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    spinner.succeed('Build completed');
  } catch (error) {
    spinner.fail(`Build script failed: ${error.message}`);
  }
}
```

## Config Schema Changes

### New: `tokens.collections[name].dir` and `tokens.collections[name].file`

```typescript
interface CollectionConfig {
  splitModes?: boolean;
  dir?: string;   // NEW: output directory, supports {mode} placeholder
  file?: string;  // NEW: file name pattern, supports {mode} placeholder
}
```

### New: `build.script`

```typescript
interface BuildConfig {
  script?: string;  // NEW: custom build command to run after sync
  styleDictionary?: { configFile: string };  // Existing (deprecated for complex setups)
  css?: { enabled: boolean; file: string };  // Existing
}
```

## Pattern Matching Examples

| SD Source | Collection | Dir | File |
|-----------|------------|-----|------|
| `` `./tokens/${brand}.json` `` | `brand` | `./tokens` | `{mode}.json` |
| `` `./raw/${brand}/brand.${brand}.tokens.json` `` | `brand` | `./raw/{mode}` | `brand.{mode}.tokens.json` |
| `./shared/globals.value.tokens.json` | `globals` | `./shared` | `globals.value.tokens.json` |
| `` `./themes/theme.${variant}.json` `` | `theme` | `./themes` | `theme.{mode}.json` |

## Acceptance Criteria

- [ ] Init fetches collections from Figma (not just validates)
- [ ] Init displays collections with modes (filtered for phantom modes)
- [ ] SD source patterns are parsed correctly (both static and template literals)
- [ ] Collection configs include dir/file patterns matched from SD sources
- [ ] Build script is detected from package.json
- [ ] Sync runs build.script after writing token files
- [ ] Factory function SD configs work (via build.script, not direct SD run)
- [ ] Existing simple SD configs still work (build.styleDictionary.configFile)

## Migration Path

1. **New projects**: Init generates correct config automatically
2. **Existing projects with factory configs**: Re-run init, or manually add `build.script`
3. **Existing projects with static SD configs**: Continue working as before
