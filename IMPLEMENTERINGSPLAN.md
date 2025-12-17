# Synkio CLI - Teknisk Implementeringsplan

**Dato:** 17. december 2025
**Teknisk Lead:** Claude
**Beslutningsejer:** Product Manager

---

## Forudsætninger

Før implementering påbegyndes:

1. **Commit alt til main** - Alle lokale ændringer skal committes og pushes
2. **Opret feature branch** - `feature/cli-improvements-v1`
3. **Parallel arbejde med koordinering** - Agenter arbejder parallelt hvor muligt, men med klare grænseflader

---

## Oversigt: Initiativer og Afhængigheder

```
┌─────────────────────────────────────────────────────────────────┐
│                        FASE 1: FUNDAMENT                        │
│                     (Skal laves først, sekventielt)             │
├─────────────────────────────────────────────────────────────────┤
│  #7 Config-fil rename (synkio.config.json)                      │
│      ↓ påvirker alt andet                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 2: UAFHÆNGIGE TASKS                     │
│                    (Kan køres parallelt)                        │
├──────────────────────┬──────────────────────┬───────────────────┤
│  #1 Programmatisk    │  #3 Version-kommando │  #4 Duplikeret    │
│     import           │                      │     kode cleanup  │
│                      │                      │                   │
│  Fil: src/index.ts   │  Fil: cli/bin.ts     │  Filer:           │
│  (ny fil)            │  (eksisterende)      │  - intermediate-  │
│                      │                      │    tokens.ts      │
│                      │                      │  - style-dict/    │
│                      │                      │    index.ts       │
└──────────────────────┴──────────────────────┴───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 3: ROBUSTHED                            │
│              (Kan køres parallelt, ingen overlap)               │
├─────────────────────────────────┬───────────────────────────────┤
│  #5 Figma data validering       │  #6 Tidligt SD-tjek           │
│                                 │                               │
│  Filer:                         │  Fil:                         │
│  - core/tokens.ts               │  - cli/commands/sync.ts       │
│  - types/schemas.ts (ny)        │                               │
└─────────────────────────────────┴───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      FASE 4: VERIFICERING                       │
│                        (Sekventielt)                            │
├─────────────────────────────────────────────────────────────────┤
│  - Kør alle tests                                               │
│  - Test med demo-app                                            │
│  - Build og verificer npm package                               │
│  - Opdater dokumentation                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Config-fil Rename (#7)

**Hvorfor først?** Dette ændrer hvor CLI'en leder efter config. Alle andre ændringer skal bruge det nye filnavn.

### Opgaver

| Task | Fil(er) | Beskrivelse |
|------|---------|-------------|
| 1.1 | `core/config.ts` | Opdater `loadConfig()` til at søge efter `synkio.config.json` først, derefter `tokensrc.json` (backwards compat) |
| 1.2 | `cli/commands/init.ts` | Ændre output-filnavn til `synkio.config.json` |
| 1.3 | `cli/commands/sync.ts` | Opdater default config-path i options |
| 1.4 | `cli/commands/*.ts` | Opdater alle references til config-filnavn |
| 1.5 | `examples/demo-app/` | Rename `tokensrc*.json` → `synkio.config.json` |
| 1.6 | `packages/cli/README.md` | Opdater dokumentation |

### Backwards Compatibility Strategi

```typescript
// I loadConfig():
const CONFIG_FILES = ['synkio.config.json', 'tokensrc.json']; // Prioriteret rækkefølge

export function loadConfig(explicitPath?: string): Config {
  if (explicitPath) {
    return loadFromPath(explicitPath);
  }

  for (const filename of CONFIG_FILES) {
    const fullPath = resolve(process.cwd(), filename);
    if (existsSync(fullPath)) {
      if (filename === 'tokensrc.json') {
        console.warn(chalk.yellow(
          `⚠️  'tokensrc.json' is deprecated. Rename to 'synkio.config.json'`
        ));
      }
      return loadFromPath(fullPath);
    }
  }

  throw new Error('No config file found. Run: synkio init');
}
```

### Acceptance Criteria
- [ ] `synkio init` opretter `synkio.config.json`
- [ ] `synkio sync` finder `synkio.config.json` automatisk
- [ ] `synkio sync` finder `tokensrc.json` med deprecation warning
- [ ] `--config` flag virker stadig med custom path

---

## FASE 2: Uafhængige Tasks (Parallel)

### #1 Programmatisk Import

**Agent-scope:** Kun `packages/cli/src/index.ts` (ny fil) + `package.json` verificering

| Task | Beskrivelse |
|------|-------------|
| 2.1.1 | Opret `src/index.ts` med public exports |
| 2.1.2 | Verificer `package.json` exports matcher |
| 2.1.3 | Test import fra dist |

**Implementation:**

```typescript
// packages/cli/src/index.ts

// Commands
export { syncCommand, watchCommand, type SyncOptions } from './cli/commands/sync.js';
export { initCommand } from './cli/commands/init.js';
export { docsCommand } from './cli/commands/docs.js';
export { validateCommand } from './cli/commands/validate.js';
export { rollbackCommand } from './cli/commands/rollback.js';

// Config
export { loadConfig, type Config } from './core/config.js';

// Types
export type {
  BaselineData,
  BaselineEntry,
  ComparisonResult,
  ValueChange,
  PathChange
} from './types/index.js';

// Utilities
export { compareBaselines, hasChanges, hasBreakingChanges } from './core/compare.js';
export { FigmaClient } from './core/figma.js';
```

### #3 Version-kommando

**Agent-scope:** Kun `packages/cli/src/cli/bin.ts`

| Task | Beskrivelse |
|------|-------------|
| 2.3.1 | Tilføj `--version` / `-v` flag handling |
| 2.3.2 | Læs version fra package.json |

**Implementation:**

```typescript
// I bin.ts, tilføj tidligt i filen:
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

// I argument parsing:
if (args.version || args.v) {
  console.log(pkg.version);
  process.exit(0);
}

// Opdater help text:
if (command === 'help' || args.help || args.h) {
  console.log(`
  synkio v${pkg.version} - Sync Figma variables to design tokens

  Usage: synkio <command> [options]
  ...
  `);
}
```

### #4 Duplikeret Kode Cleanup

**Agent-scope:** `intermediate-tokens.ts` og `style-dictionary/index.ts`

| Task | Beskrivelse |
|------|-------------|
| 2.4.1 | Identificer præcis hvilken kode der er duplikeret |
| 2.4.2 | Behold `convertToIntermediateFormat()` som single source |
| 2.4.3 | Opdater `style-dictionary/index.ts` til at importere i stedet for at have egen kopi |
| 2.4.4 | Flyt delt `normalizeColorValue()` til fælles utils |
| 2.4.5 | Verificer alle call sites stadig virker |

**Vigtig note:** Før sletning, verificer at ingen anden kode kalder den duplikerede funktion direkte.

**Implementation:**

```typescript
// Ny fil: core/utils/color.ts
export function normalizeColorValue(value: unknown, type: string): unknown {
  if (type.toLowerCase() === 'color' && typeof value === 'object' && value !== null) {
    const v = value as { r?: number; g?: number; b?: number; a?: number };
    if ('r' in v && 'g' in v && 'b' in v) {
      const r = Math.round((v.r ?? 0) * 255);
      const g = Math.round((v.g ?? 0) * 255);
      const b = Math.round((v.b ?? 0) * 255);
      const a = v.a ?? 1;

      if (a === 1) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return value;
}

// I style-dictionary/index.ts:
// SLET convertToDTCG() funktionen
// SLET normalizeColorValue() funktionen
// Opdater buildWithStyleDictionary() til ALTID at bruge convertToIntermediateFormat()
```

---

## FASE 3: Robusthed (Parallel)

### #5 Figma Data Validering

**Agent-scope:** `core/tokens.ts` + ny `types/schemas.ts`

| Task | Beskrivelse |
|------|-------------|
| 3.5.1 | Opret Zod schema for Synkio plugin data format |
| 3.5.2 | Opret Zod schema for legacy format |
| 3.5.3 | Opdater `normalizePluginData()` til at validere med Zod |
| 3.5.4 | Tilføj brugervenlige fejlbeskeder |

**Implementation:**

```typescript
// types/schemas.ts
import { z } from 'zod';

export const SynkioTokenEntrySchema = z.object({
  variableId: z.string(),
  collection: z.string(),
  mode: z.string(),
  path: z.string(),
  value: z.unknown(),
  type: z.string(),
  description: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  codeSyntax: z.object({
    WEB: z.string().optional(),
    ANDROID: z.string().optional(),
    iOS: z.string().optional(),
  }).optional(),
});

export const SynkioPluginDataSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  tokens: z.array(SynkioTokenEntrySchema),
});

// I tokens.ts:
export function normalizePluginData(rawData: unknown): RawTokens {
  // Prøv Synkio format først
  const synkioResult = SynkioPluginDataSchema.safeParse(rawData);
  if (synkioResult.success) {
    return convertSynkioFormat(synkioResult.data);
  }

  // Prøv legacy format
  const legacyResult = LegacyPluginDataSchema.safeParse(rawData);
  if (legacyResult.success) {
    return convertLegacyFormat(legacyResult.data);
  }

  // Ingen format matchede - giv brugbar fejl
  throw new PluginDataError(
    'Invalid data from Figma. Please ensure you have run the Synkio plugin.\n\n' +
    'Expected format not found. This could mean:\n' +
    '  - The Synkio plugin has not been run on this file\n' +
    '  - The plugin data is corrupted\n' +
    '  - You are using an incompatible plugin version\n\n' +
    'Run the Synkio plugin in Figma and try again.'
  );
}
```

### #6 Tidligt Style Dictionary Tjek

**Agent-scope:** Kun `cli/commands/sync.ts`

| Task | Beskrivelse |
|------|-------------|
| 3.6.1 | Tilføj SD availability check lige efter config load |
| 3.6.2 | Vis warning/fejl før Figma fetch starter |

**Implementation:**

```typescript
// I syncCommand(), lige efter loadConfig():
if (config.output.mode === 'style-dictionary') {
  const sdAvailable = await isStyleDictionaryAvailable();
  if (!sdAvailable) {
    spinner.fail(chalk.red(
      'Style Dictionary mode is configured but style-dictionary is not installed.\n\n' +
      '  Install it with: npm install -D style-dictionary\n' +
      '  Or change output.mode to "json" in synkio.config.json'
    ));
    process.exit(1);
  }
}
```

---

## FASE 4: Verificering

### Verificeringstasks (Sekventielt)

| Task | Beskrivelse |
|------|-------------|
| 4.1 | `npm run build` - verificer ingen TypeScript fejl |
| 4.2 | `npm run test` - verificer alle tests passer |
| 4.3 | Test i demo-app: `cd examples/demo-app && npx synkio sync` |
| 4.4 | Test backwards compat: rename config til `tokensrc.json`, verificer warning |
| 4.5 | Test programmatisk import: opret test-script der importerer fra pakken |
| 4.6 | `synkio --version` - verificer output |
| 4.7 | Opdater README.md med nyt config-filnavn |

---

## Parallel Execution Plan

```
Tid →
─────────────────────────────────────────────────────────────────────

FASE 1 (Sekventiel - Teknisk Lead):
├── #7 Config rename ────────────────────┤

FASE 2 (Parallel - 3 Agenter):
                                         ├── Agent A: #1 Import ──┤
                                         ├── Agent B: #3 Version ─┤
                                         ├── Agent C: #4 Cleanup ─┤

FASE 3 (Parallel - 2 Agenter):
                                                                  ├── Agent D: #5 Validering ─┤
                                                                  ├── Agent E: #6 SD-tjek ────┤

FASE 4 (Sekventiel - Teknisk Lead):
                                                                                              ├── Verificering ─┤
```

---

## Koordineringsregler

### Fil-ejerskab under parallel execution

| Fase | Agent | Ejer disse filer | Må IKKE røre |
|------|-------|------------------|--------------|
| 2 | A | `src/index.ts` (ny) | Alt andet |
| 2 | B | `cli/bin.ts` | Alt andet |
| 2 | C | `intermediate-tokens.ts`, `style-dictionary/index.ts`, `core/utils/` (ny) | Alt andet |
| 3 | D | `core/tokens.ts`, `types/schemas.ts` (ny) | Alt andet |
| 3 | E | `cli/commands/sync.ts` | Alt andet |

### Eskaleringsregler

Teknisk Lead eskalerer til Product Manager hvis:

1. **Uventet afhængighed opdages** - En ændring påvirker en fil en anden agent ejer
2. **Breaking change i API** - En ændring ville bryde eksisterende bruger-scripts
3. **Test fejler uventet** - Noget der virkede før virker ikke længere
4. **Scope creep** - En agent vil lave mere end hvad der er defineret

### Merge-strategi

1. Hver agent committer til sin egen branch: `feature/cli-improvements-v1-{initiativ-nummer}`
2. Teknisk Lead merger sekvientielt efter review
3. Conflicts løses af Teknisk Lead før merge

---

## Estimeret Tidsplan

| Fase | Varighed | Beskrivelse |
|------|----------|-------------|
| Pre | 15 min | Commit eksisterende, opret branch |
| Fase 1 | 1-2 timer | Config rename (sekventiel) |
| Fase 2 | 1-2 timer | 3 parallelle tasks |
| Fase 3 | 1-2 timer | 2 parallelle tasks |
| Fase 4 | 1 time | Verificering og dokumentation |
| **Total** | **4-7 timer** | |

---

## Næste Skridt

1. **Godkend denne plan**
2. Jeg starter med at committe eksisterende ændringer til main
3. Opretter `feature/cli-improvements-v1` branch
4. Påbegynder Fase 1 (#7 Config rename)
5. Når Fase 1 er færdig, starter jeg parallelle agenter for Fase 2

---

*Skal jeg påbegynde udførelsen?*
