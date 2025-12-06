# Quick Start Guide

## Install Plugin i Figma

1. Åbn Figma Desktop app
2. Gå til **Plugins → Development → Import plugin from manifest**
3. Vælg filen: `/Users/rasmus/clarity-ds/figma-token-importer/manifest.json`
4. Plugin vises nu i "Development" sektionen

## Importér Clarity Design System

### Trin 1: Start Plugin

1. Højreklik i Figma canvas
2. Vælg **Plugins → Development → Design Token Importer**

### Trin 2: Upload Filer

Du kan enten:

**Option A - Drag & Drop:**
- Træk alle JSON filer fra `/Users/rasmus/clarity-ds/tokens/` til upload-området

**Option B - Browse:**
- Klik på upload-området
- Vælg alle filer fra:
  - `tokens/primitives/*.json`
  - `tokens/brands/*.json`
  - `tokens/themes/*.json`

### Trin 3: Klik "Clarity Preset"

Dette opretter automatisk:

```
Collection: Primitives (1 mode: default)
├── colors
├── spacing
├── typography
├── radii
├── shadows
└── transitions

Collection: Brand (8 modes)
├── clarity
├── velocity
├── zenith
├── neon
├── bolt
├── chill
├── odd
└── dunno

Collection: Theme (2 modes)
├── light
└── dark
```

### Trin 4: Import

Klik **"Import to Figma"** - Done! ✨

## Se Resultatet

1. Åbn **Local variables** panelet (højre sidebar)
2. Du skulle se tre collections med alle dine tokens
3. Brand og Theme har multiple modes du kan skifte mellem

## Næste Skridt: Export til baseline-snapshot.json

Nu hvor tokens er i Figma som Variables, kan du:

1. Bruge TokensBridge plugin til at eksportere til `.baseline-snapshot.json`
2. Eller bygge export-funktionalitet direkte i dette plugin

## Custom Setup

Hvis du vil have en anden struktur:

1. Upload filerne
2. Klik **"Custom Setup"** i stedet for Clarity Preset
3. Klik **"+ Add Collection"**
4. Konfigurér manuelt:
   - Collection navn
   - Om det er multi-mode
   - Hvilke filer der tilhører collectionen

## Troubleshooting

**Filer uploader ikke:**
- Check at det er `.json` filer
- Verificér JSON syntaks er valid

**Collections mangler tokens:**
- Check at du har valgt rigtige filer til hver collection
- Verificér at JSON strukturen matcher `{ "value": ..., "type": "..." }`

**Farver ser forkerte ud:**
- Check at color values er `#hex` format
- RGBA bliver kun supporteret med opacity = 1

## Update Plugin

Efter ændringer i koden:

```bash
cd /Users/rasmus/clarity-ds/figma-token-importer
npm run build
```

Genindlæs plugin i Figma (eller genstart Figma).
