# Teknisk Review: Synkio UI Plugin

**Dato**: 17. december 2025
**Reviewer**: Claude (Figma Plugin Specialist)
**Plugin**: Synkio UI
**Status**: ⚠️ Næsten publish-klar

---

## Samlet Vurdering

Synkio UI er et velstruktureret plugin med god kodearkitektur og solid funktionalitet. Der er **2 kritiske rettelser** der blokerer Figma Community publish, samt en række anbefalinger til forbedring.

---

## KRITISKE RETTELSER (Blokerer Publish)

### 1. Manglende `documentAccess` i manifest.json

**Fil**: `packages/figma-plugin/synkio-ui/manifest.json`

**Problem**: Figma kræver `documentAccess: "dynamic-page"` for alle nye plugins.

**Nuværende**:
```json
{
  "name": "Synkio UI",
  "id": "synkio-ui",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["none"]
  },
  "permissions": ["currentuser"]
}
```

**Rettelse** - tilføj `documentAccess`:
```json
{
  "name": "Synkio UI",
  "id": "synkio-ui",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "documentAccess": "dynamic-page",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["none"]
  },
  "permissions": ["currentuser"]
}
```

---

### 2. Console.log statements i production kode

**Filer**: `code.ts` og `ui.ts`

**Problem**: Figma kan afvise plugins med debug output. Det fylder også i brugerens console.

**Linjer der skal fjernes/udkommenteres**:

**code.ts**:
- Linje 11: `console.log('=== SYNKIO UI PLUGIN STARTING ===');`
- Linje 17: `console.log('Showing UI...');`
- Linje 22: `console.log('UI shown');`
- Linje 195-200: `console.log('Sending update to UI:', {...});`
- Linje 215: `console.log('Setting up message handler');`
- Linje 217: `console.log('=== MESSAGE HANDLER CALLED ===');`
- Linje 219: `console.log('Received message:', msg);`
- Linje 222: `console.log('UI is ready');`
- Linje 227: `console.log('Sync request');`
- Linje 269: `console.log('Waiting for UI to be ready...');`

**ui.ts**:
- Linje 5: `console.log('=== UI.JS LOADING ===');`
- Linje 71: `console.log('Sync button clicked');`
- Linje 73: `console.log('Already syncing, ignoring');`
- Linje 82: `console.log('Sending sync message to plugin');`
- Linje 261-266: Alle `console.log` i message handler
- Linje 272: `console.log('Update received, ...');`
- Linje 283: `console.log('Message was not an update, msg:', msg);`
- Linje 288-292: Alle `console.log` i initialize sektion

**Anbefaling**: Opret en debug flag eller fjern alle console.log statements før build.

---

## HØJE ANBEFALINGER (Før Publish)

### 3. Tilføj shared.ts til .gitignore

**Problem**: Build-scriptet genererer `shared.ts` som ikke bør committes.

**Rettelse** - tilføj til `.gitignore`:
```
shared.ts
```

---

### 4. Version mismatch

**Problem**:
- `ui.html` viser `v1.0`
- `SyncData.version` er `2.0.0`
- `package.json` er `1.0.0`

**Anbefaling**: Synkroniser alle versioner eller fjern version badge fra UI.

---

### 5. Sync knap ikon er forvirrende

**Fil**: `ui.html` linje 372

**Problem**: Sync-knappen viser `✓` som default, hvilket kan få brugeren til at tro de allerede har synced.

**Nuværende**:
```html
<span id="syncIcon">✓</span>
```

**Anbefaling** - brug neutralt ikon:
```html
<span id="syncIcon">↻</span>
```

Eller:
```html
<span id="syncIcon">⬆</span>
```

---

## COMMUNITY PUBLISH KRAV

### Checklist før submission

| Krav | Status | Handling |
|------|--------|----------|
| `documentAccess: "dynamic-page"` | ❌ | Tilføj til manifest |
| Ingen console.log | ❌ | Fjern alle debug logs |
| Plugin ID | ⚠️ | Figma tildeler ved publish |
| Beskrivelse | ⚠️ | Skriv detaljeret beskrivelse |
| Screenshots (2-3 stk) | ⚠️ | Tag screenshots af Diff og History views |
| Support kontakt | ⚠️ | Tilføj email eller link |
| Security disclosure | ⚠️ | Udfyld Figmas formular |
| Privacy policy | ⚠️ | Anbefales (gemmer brugernavne) |

---

## NICE TO HAVE (Efter Publish)

### 6. Rename-detection kan forbedres

**Fil**: `packages/shared/src/compare.ts` linje 50-61

**Problem**: Matcher kun på antal modes, ikke indhold. Kan give false positives.

**Eksempel på fejl**:
- "Colors" (light, dark) slettes
- "Spacing" (mobile, desktop) tilføjes
- Plugin tror fejlagtigt at "Colors" blev omdøbt til "Spacing"

---

### 7. Konsolider duplikeret kode

`resolveValue()` og `collectTokens()` findes i både Synkio Sync og Synkio UI. Overvej at flytte til `shared/` package.

---

### 8. API version opdatering

Nuværende: `"api": "1.0.0"`
Nyeste: `1.119+` (november 2025)

Ikke kritisk, men nyere version giver bedre typings og bug fixes.

---

## SIKKERHED & DATA

### ✅ Korrekt implementeret

| Område | Status |
|--------|--------|
| Network Access | `"allowedDomains": ["none"]` - ingen netværk |
| Data Storage | Kun `sharedPluginData` på `figma.root` |
| Permissions | Kun `currentuser` (kræves for sync history) |
| No Proposed API | `enableProposedApi: false` |

### ⚠️ Privacy note

Plugin'et gemmer brugernavne i sync history. Dette bør nævnes i:
1. Plugin beskrivelsen
2. Security disclosure formularen

---

## OPSUMMERING

### Skal rettes FØR publish:
1. ✏️ Tilføj `documentAccess: "dynamic-page"` til manifest.json
2. ✏️ Fjern alle console.log statements

### Skal forberedes TIL publish:
3. 📝 Skriv plugin beskrivelse
4. 📸 Tag 2-3 screenshots
5. 📧 Angiv support kontakt
6. 🔒 Udfyld security disclosure

### Kan vente til EFTER publish:
7. Forbedre rename-detection logik
8. Konsolidere duplikeret kode
9. Opdatere API version

---

## Kilder

- [Figma Plugin Manifest](https://developers.figma.com/docs/plugins/manifest/)
- [Plugin Review Guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines)
- [Publish to Community](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)
