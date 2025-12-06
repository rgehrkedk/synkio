# Figma Token Sync

Automatisk sammenligning af design tokens mellem Figma og lokal kodebase.

## Quick Start

```bash
figma-check
```

Eller manuelt:
```bash
cd packages/theme
pnpm check-figma --remote
```

## Setup

### 1. Figma Plugin

Installer plugin'et i Figma:
1. Åbn Figma Desktop
2. Højreklik → Plugins → Development → Import plugin from manifest
3. Vælg: `figma/figma-token-sync-plugin/manifest.json`

### 2. Environment Variables

Opret `.env` fil i `packages/theme/`:

```env
FIGMA_TOKEN=figd_xxxxx
FIGMA_FILE_KEY=IDaXDDvcIU1nDvuIP0IG47
FIGMA_REGISTRY_NODE=25818:1937
```

**FIGMA_TOKEN**: Personlig access token fra https://www.figma.com/developers/api#access-tokens

**FIGMA_FILE_KEY**: ID fra Figma fil-URL (default: e-Boks Design System)

**FIGMA_REGISTRY_NODE**: Node ID fra plugin (se næste sektion)

### 3. Sync til Node (første gang)

1. Kør plugin i Figma
2. Gå til **Registry** tab
3. Vælg hvilke collections der skal synkes
4. Klik **"Sync to Node"**
5. Kopiér Node ID til `.env` filen

## Daglig Brug

### Check for ændringer

```bash
figma-check
```

Output eksempel:
```
Loading local baseline...
  Local tokens: 352

Fetching from Figma API...
  Node: 25818:1937
  Variables: 720
  Saved to: .figma-snapshot.json
  Figma tokens: 352

============================================================
FIGMA TOKEN CHECK REPORT
============================================================

📝 VALUE CHANGES
  colors.brand.primary.200:
    Local:  #404c9c
    Figma:  #4279ff

➕ NEW TOKENS IN FIGMA
  Globals.ScreenSize.MinWidth (number)

------------------------------------------------------------
SUMMARY
------------------------------------------------------------
  Renames:       0
  Value changes: 1
  Additions:     3
  Deletions:     0

  ℹ️  STATUS: Changes available (non-breaking)
============================================================
```

### Efter ændringer i Figma

1. **Kør plugin** → Registry tab → Sync to Node
2. **Kør check**: `figma-check`
3. **Se diff**: Sammenlign `.baseline-snapshot.json` med `.figma-snapshot.json`

## Filer

| Fil | Beskrivelse |
|-----|-------------|
| `.baseline-snapshot.json` | Lokal "source of truth" - tokens i kodebasen |
| `.figma-snapshot.json` | Seneste snapshot fra Figma (genereres ved check) |
| `.env` | API credentials (gitignored) |

## Arkitektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Figma Plugin   │────▶│  Figma REST API │◀────│  CLI Script     │
│  (Sync to Node) │     │  (sharedPlugin  │     │  (check-figma)  │
│                 │     │   Data)         │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
   Gemmer tokens                                  Henter tokens
   som JSON chunks                                og sammenligner
   på en Figma node                               med lokal baseline
```

**Fordele:**
- ✅ Ingen AI/MCP nødvendig
- ✅ Kører direkte fra terminal
- ✅ Kan integreres i CI/CD
- ✅ Hurtig (~2 sekunder)

## Scripts

```json
{
  "check-figma": "tsx ./scripts/checkFigmaTokens.ts",
  "fetch-registry": "tsx ./scripts/fetchFigmaRegistry.ts"
}
```

## Fejlfinding

### "No data from plugin"
→ Kør "Sync to Node" i Figma plugin først

### "FIGMA_TOKEN required"  
→ Sæt token i `.env` fil

### "Node not found"
→ Tjek at FIGMA_REGISTRY_NODE er korrekt (format: `12345:6789`)

### Plugin viser ikke "Sync to Node"
→ Rebuild plugin: `cd figma/figma-token-sync-plugin && pnpm build`

---

## Gør Sync Node Feature Agnostisk

Pt. er løsningen bundet til e-Boks projektet. Her er hvad der skal til for at gøre den generisk og genbrugelig.

### Nuværende Bindinger

| Hardcoded værdi | Placering | Beskrivelse |
|-----------------|-----------|-------------|
| `eboks_tokens` | `code.ts`, `checkFigmaTokens.ts`, `fetchFigmaRegistry.ts` | Plugin namespace |
| `IDaXDDvcIU1nDvuIP0IG47` | `checkFigmaTokens.ts`, `fetchFigmaRegistry.ts` | Default Figma file key |
| `_token_registry` | `code.ts` | Registry node navn |
| `e-Boks-com/token-vault` | `ui.html` | GitHub repo til PR |
| `.baseline-snapshot.json` | Flere steder | Baseline filnavn |

### Trin 1: Plugin Namespace som Config

**Problem:** Namespace `eboks_tokens` er hardcoded i 3 filer.

**Løsning:** Flyt til en fælles config eller gør det dynamisk baseret på Figma fil-navn.

```typescript
// Forslag: Brug Figma fil-id som namespace
const PLUGIN_NAMESPACE = `tokens_${figma.fileKey?.slice(0,8) || 'default'}`
```

### Trin 2: Fjern Default File Key

**Problem:** Script har hardcoded default til e-Boks Figma fil.

**Løsning:** Kræv altid `FIGMA_FILE_KEY` i `.env`:

```typescript
// checkFigmaTokens.ts
const fileKey = process.env.FIGMA_FILE_KEY
if (!fileKey) {
  console.error('Error: FIGMA_FILE_KEY is required')
  process.exit(1)
}
```

### Trin 3: Publicér som NPM Package

**Struktur:**
```
@your-org/figma-token-sync/
├── cli/
│   ├── check.ts       # CLI: figma-tokens check
│   └── fetch.ts       # CLI: figma-tokens fetch
├── plugin/
│   ├── code.ts        # Figma plugin backend
│   └── ui.html        # Figma plugin UI
└── package.json
```

**CLI brug:**
```bash
npx @your-org/figma-token-sync check --file=xxx --node=yyy
```

### Trin 4: GitHub Integration som Optional

**Problem:** GitHub repo er hardcoded i plugin UI.

**Løsning:** Gør det konfigurerbart via plugin storage:

```typescript
// Gem i figma.clientStorage
const config = await figma.clientStorage.getAsync('github-config')
// Default: ingen GitHub integration
```

### Trin 5: Baseline Fil som Parameter

**Problem:** Script forventer `.baseline-snapshot.json` i fast placering.

**Løsning:** Acceptér som CLI argument:

```bash
figma-tokens check --baseline=./tokens/snapshot.json
```

### Trin 6: Collection Filter Presets

**Nuværende:** Bruger skal vælge collections manuelt hver gang.

**Forbedring:** Gem valgte collections som preset:

```typescript
// Plugin gemmer sidste valg
await figma.clientStorage.setAsync('sync-collections', selectedIds)
```

### Minimal Agnostisk Version

For hurtigste vej til agnostisk:

1. **Erstat hardcoded namespace** → Brug env var `FIGMA_PLUGIN_NAMESPACE`
2. **Fjern default file key** → Kræv altid i `.env`
3. **Gør GitHub optional** → Tjek om config eksisterer før PR-knap vises

```env
# Generisk .env
FIGMA_TOKEN=figd_xxxxx
FIGMA_FILE_KEY=your-file-key
FIGMA_REGISTRY_NODE=123:456
FIGMA_PLUGIN_NAMESPACE=my_project_tokens  # Optional, default: figma_tokens
```

### Estimeret Arbejde

| Opgave | Tid |
|--------|-----|
| Namespace som env var | 30 min |
| Fjern default file key | 15 min |
| GitHub som optional | 1 time |
| NPM package struktur | 2-3 timer |
| CLI med args parsing | 1-2 timer |
| **Total minimal** | **~1 time** |
| **Total fuld agnostisk** | **~6 timer** |
