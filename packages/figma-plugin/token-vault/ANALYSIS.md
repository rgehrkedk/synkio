# Token Vault Plugin - Objektiv Analyse

**Dato:** 2025-12-14
**Plugin Version:** 2.0.0
**Formål:** Kritisk gennemgang af legacy-kode, half-baked features, og UI/UX problemer

---

## Executive Summary

Token Vault er et Figma plugin med tre hovedfunktioner: Import, Export og Sync. Kodebasen har nyligt gennemgået en større refaktorering fra "wizard-based" til "flexible import", hvilket har efterladt **betydelige tekniske problemer** inklusiv build errors og uafsluttede migrationer.

**Kritiske Fund:**
- 🔴 **Build fejler**: Plugin kan ikke kompileres (`baseline-detector.ts` mangler)
- 🟡 **Legacy kode ikke fjernet**: Wizard-baserede imports er stadig i kodebasen
- 🟠 **Half-baked multi-file import**: Kompleks flow med UI/UX problemer
- 🟢 **Export & Sync er stabile**: Disse features fungerer solidt

---

## 1. Legacy Kode - Skal Fjernes

### 1.1 Wizard Import System (DEPRECATED)

**Fil:** `src/backend/import/index.ts`
**Status:** Marked as deprecated in message types, men stadig implementeret

```typescript
// Legacy import (will be deprecated)
| { type: 'import-tokens'; data: { collections: CollectionConfig[] } }
```

**Problemer:**
- Hele `importTokens()` funktionen i `src/backend/import/index.ts` er ikke længere i brug
- Message handler findes stadig i `message-router.ts` (linje 89)
- UI komponenten `collection-config.ts.LEGACY` ligger stadig i kodebasen

**Anbefaling:**
- ✅ Fjern `import-tokens` message type
- ✅ Fjern `importTokens()` og `importCollection()` funktioner
- ✅ Slet `src/ui/components/collection-config.ts.LEGACY`
- ✅ Fjern `CollectionConfig` interface fra state management (kun brugt til legacy)

---

### 1.2 Deprecated Function - createCollectionInFigma

**Fil:** `src/backend/import/baseline-importer.ts` (linje 588)

```typescript
/**
 * @deprecated Use createOrUpdateCollectionInFigma instead
 */
async function createCollectionInFigma(name: string, data: CollectionData): Promise<ImportResult>
```

**Status:** Markeret som deprecated men stadig implementeret (60+ linjer kode)

**Anbefaling:**
- ✅ Fjern hele funktionen hvis ikke brugt
- ✅ Eller dokumenter hvorfor den skal bibeholdes

---

### 1.3 Missing baseline-detector.ts

**KRITISK BUILD ERROR**

```
ERROR: Could not resolve "../../backend/utils/baseline-detector.js"
src/ui/components/baseline-confirmation.ts:14:36
```

**Files der importerer det manglende modul:**
- `src/ui/components/baseline-confirmation.ts`
- `src/ui/state.ts`
- `src/types/message.types.ts`
- `src/backend/handlers/message-router.ts`
- `src/backend/import/baseline-importer.ts`

**Analyse:**
`BaselineDetectionResult` type bruges i 5+ filer, men selve `baseline-detector.ts` eksisterer ikke i kodebasen. Dette indikerer:
1. Filen blev slettet ved en fejl under refaktorering
2. Eller functionality blev moved uden at opdatere imports

**Anbefaling:**
- 🔴 **KRITISK**: Genopret `baseline-detector.ts` eller refaktorer imports
- Plugin kan ikke bygges i nuværende tilstand

---

## 2. Half-Baked Features

### 2.1 Multi-File Import Flow

**Komponenter involveret:**
- `file-grouping.ts` - Fil gruppering UI
- `multi-collection-config.ts` - Per-collection konfiguration
- `level-selector.ts` - Level mapping
- `structure-preview.ts` - Preview af struktur
- `live-preview.ts` - Live preview

**Status:** Implementeret men med flere problemer

**Problemer identificeret:**

#### 2.1.1 Kompleks State Management

State flow er fragmenteret over 5+ komponenter:

```typescript
// State properties for flexible import
currentImportStep?: ImportStep;           // 'upload' | 'group' | 'configure' | 'preview'
fileGroups?: FileGroup[];                 // File gruppering
structureConfig?: StructureConfigState;   // Level configuration
collectionConfigurations?: CollectionConfiguration[]; // UNUSED?
```

`collectionConfigurations` er defineret i state men ikke bruges nogen steder i kodebasen.

**Anbefaling:**
- ⚠️ Fjern `collectionConfigurations` hvis ubrugt
- ⚠️ Dokumenter state transitions mellem steps

---

#### 2.1.2 Auto-trigger Race Conditions

**Fil:** `file-grouping.ts` (linje 52-54)

```typescript
// Set timestamp to block auto-triggers for first 500ms
uiReadyTimestamp = Date.now();
console.log('[FileGrouping] UI ready at:', uiReadyTimestamp);
```

Denne workaround indikerer timing issues i UI flow. Der er ingen dokumentation af hvorfor dette er nødvendigt.

**Anbefaling:**
- ⚠️ Refaktorer til event-based system i stedet for timing workarounds
- ⚠️ Dokumenter edge cases der kræver timing protection

---

#### 2.1.3 Mode Extraction Logic Dupliceret

**Filer:**
- `src/backend/utils/mode-extractor.ts`
- `src/ui/components/multi-collection-config.ts` (linje 26-42)

Samme "extract mode name from filename" logic eksisterer både i backend og UI:

```typescript
// UI version
function extractModeNameFromFilename(filename: string): string {
  // ... duplicate logic
}
```

**Anbefaling:**
- ✅ Konsolider til én funktion (shared utility)
- ✅ Eller dokumenter hvorfor både UI og backend har sin egen version

---

#### 2.1.4 Sequential Collection Analysis

**Fil:** `multi-collection-config.ts` (linje 84-86)

```typescript
// Start analyzing first collection
currentAnalyzingIndex = 0;
analyzeNextCollection();
```

Multi-collection analysis sker sekventielt (én ad gangen) i stedet for parallel. Dette gør UX langsom for mange filer.

**Anbefaling:**
- 💡 Overvej parallel analysis for bedre performance
- 💡 Vis progress indicator for langsom operations

---

### 2.2 Preview System

**Filer:**
- `structure-preview.ts` - Viser JSON struktur
- `live-preview.ts` - Viser Figma output preview

**Status:** Implementeret men UX er uklar

**Problemer:**

#### 2.2.1 To Forskellige Preview Types

Det er uklart for brugeren hvad forskellen er mellem:
- "Structure Preview" - Viser JSON levels
- "Live Preview" - Viser Figma collections/modes/variables

Begge vises samtidigt under import flow.

**Anbefaling:**
- 💡 Konsolider til én unified preview
- 💡 Eller gør forskellen eksplicit i UI ("JSON Structure" vs "Figma Output")

---

### 2.3 Notification System

**Fil:** `ui/index.ts` (linje 561-569)

```typescript
function showNotification(message: string, type: 'error' | 'success' | 'info' = 'info'): void {
  // Simple alert for now - can be replaced with a toast component
  if (type === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  alert(message); // ❌ Native browser alert
}
```

**Problemer:**
- Native `alert()` bruges i stedet for Figma toast notifications
- Blokerer UI thread
- Dårlig UX sammenlignet med moderne toast system

**Anbefaling:**
- ✅ Implementer toast notification component
- ✅ Brug Figma's built-in `figma.notify()` hvor muligt (backend only)

---

## 3. UI/UX Problemer

### 3.1 Tab Navigation

**HTML:** `ui.html` (linje 8-13)

```html
<div class="segmented-control" role="tablist">
  <button class="active" data-tab="import" role="tab">Import</button>
  <button data-tab="export" role="tab">Export JSON</button>
  <button data-tab="sync" role="tab">Sync to Node</button>
</div>
```

**Observation:**
- Tab struktur er god og følger accessibility best practices
- State management mellem tabs fungerer korrekt

✅ Ingen problemer identificeret

---

### 3.2 Import Tab - Flere Hidden Sections

**HTML:** `ui.html` (linje 27-49)

Import tab har 6 forskellige sections der vises/skjules dynamisk:
1. File Upload (altid synlig)
2. Baseline Confirmation
3. Structure Preview
4. File Grouping
5. Multi-Collection Config
6. Level Selector
7. Live Preview

**Problem:**
Flow er kompleks og det kan være forvirrende for brugeren at følge med i hvor de er i processen.

**Anbefaling:**
- 💡 Tilføj step indicator (1/4, 2/4, etc.)
- 💡 Vis breadcrumbs: "Upload → Group → Configure → Preview"
- 💡 Disable/hide irrelevante sections i stedet for `display: none`

---

### 3.3 Empty State Handling

**Export & Sync Tabs:** `ui.html` (linje 63-67, 90-94)

```html
<div class="loading">
  <div class="spinner"></div>
  Loading collections...
</div>
```

**Observation:**
- Loading state er implementeret
- Men ingen handling af tom state (hvad hvis 0 collections?)

**Anbefaling:**
- 💡 Tilføj empty state UI: "No collections found. Create one in Figma first."

---

### 3.4 Sync Success Screen

**Fil:** `ui.html` (linje 138-190)

Sync success screen er **meget polished**:
- ✅ Visual checkmark icon
- ✅ Copyable Node ID (med copy icon)
- ✅ Detailed metadata (variables synced, timestamp)
- ✅ Clear action buttons ("Sync Again" / "Done")

**Dette er et godt eksempel på UI/UX done right!**

---

### 3.5 CSS Organization

**Filer:**
- `base.css` - Base styles
- `components.css` - Reusable components
- `tabs.css` - Tab navigation
- `sync-changes.css` - Sync diff view
- Flere komponent-specifikke CSS filer

**Observation:**
- God separation of concerns
- Men `multi-collection-config.css` er referenced i imports men mangler i projekt

**Anbefaling:**
- ✅ Verificer at alle CSS imports eksisterer

---

## 4. Kode Kvalitet

### 4.1 Console Logging

**119 console statements** fundet i kodebasen:
- `console.log` - 80+
- `console.error` - 20+
- `console.warn` - 10+

**Eksempel:** `ui/index.ts`

```typescript
console.log('[UI] initiateFlexibleImport - files.size:', state.files.size);
console.log('[UI] Files:', Array.from(state.files.keys()));
```

**Problemer:**
- Mange debug logs stadig i production kode
- Inconsistent prefixing (`[UI]`, `[Backend]`, `[FileGrouping]`)

**Anbefaling:**
- ✅ Implementer proper logging framework
- ✅ Brug environment-based logging (dev only)
- ✅ Standardiser log prefixes

---

### 4.2 Type Safety

**Observation:**
- God brug af TypeScript
- Type-safe message passing mellem UI og backend
- Exhaustiveness checks i switch statements

**Eksempel:** `message-router.ts` (linje 107-110)

```typescript
default:
  // TypeScript exhaustiveness check
  const _exhaustive: never = msg;
  console.warn('Unknown message type:', _exhaustive);
```

✅ Dette er best practice!

---

### 4.3 Test Coverage

**24 test filer** fundet:
- Backend tests: 13
- UI component tests: 7
- Integration tests: 4

**Test setup:**
- Vitest for unit tests
- Happy-DOM for UI component testing
- Good separation of test files

✅ Test coverage er solid!

---

## 5. Arkitektur Review

### 5.1 Message Routing System

**Fil:** `message-router.ts`

**Strengths:**
- ✅ Clean separation mellem UI og backend
- ✅ Type-safe messages (UIMessage & PluginMessage unions)
- ✅ Centralized routing med exhaustiveness checks
- ✅ Clear documentation af message flow

**Struktur:**
```
UI → message-bridge → figma.ui.onmessage → handleMessage → [handler] → response
```

Dette er godt designet!

---

### 5.2 Backend Moduler

**Export System:** `backend/export/`
- ✅ Clean baseline snapshot creation
- ✅ Transformer for different formats
- ✅ Good separation

**Sync System:** `backend/sync/`
- ✅ Chunking for large data (workaround for Figma plugin data size limits)
- ✅ Metadata management
- ✅ Node manager for registry node

**Import System:** `backend/import/`
- ⚠️ Multiple import strategies (legacy + flexible + baseline)
- ⚠️ Complexity fra support af multiple formats
- ⚠️ Alias resolution system er complex men nødvendig

---

### 5.3 Type Inference System

**Fil:** `backend/type-inference/`

Automatisk type inference fra token paths:
- Pattern matching (e.g., "color", "spacing")
- Rule-based inference
- Fallback til STRING type

**Status:** Implementeret og fungerer godt ✅

---

## 6. Prioriterede Anbefalinger

### 🔴 KRITISK (Fix Nu)

1. **Fix build error** - Genopret eller refaktorer `baseline-detector.ts`
2. **Fjern deprecated kode** - `collection-config.ts.LEGACY` og `createCollectionInFigma`
3. **Fix CSS imports** - Verificer at `multi-collection-config.css` eksisterer

### 🟡 VIGTIG (Fix Snart)

4. **Konsolider mode extraction** - En funktion i stedet for to
5. **Implementer toast notifications** - Erstat `alert()`
6. **Tilføj step indicator** til import flow
7. **Fjern unused state** - `collectionConfigurations` i AppState

### 🟢 FORBEDRINGER (Nice to Have)

8. **Parallel collection analysis** - Bedre performance
9. **Unified preview system** - Gør forskellen mellem previews klar
10. **Production logging** - Environment-based logging framework
11. **Empty state handling** - UI for tom collections liste
12. **Dokumentation** - Beskriv state transitions og edge cases

---

## 7. Konklusion

Token Vault har en **solid arkitektur** med god separation of concerns og type safety. Export og Sync features er **production-ready**.

Problemer er primært fokuseret på:
1. **Build errors** fra incomplete refactoring
2. **Legacy kode** der ikke blev fjernet
3. **Complex multi-file import** flow der ikke er helt færdig
4. **UI/UX polish** mangler i enkelte områder

**Overordnet vurdering:**
- Export/Sync: **8/10** ✅
- Baseline Import: **6/10** ⚠️ (virker men build fejler)
- Flexible Import: **4/10** 🔴 (half-baked, kompleks)
- Kode kvalitet: **7/10** ✅
- Test coverage: **8/10** ✅

**Anbefaling:**
Focus på at færdiggøre flexible import systemet ELLER forenkle det drastisk. Nuværende tilstand er for kompleks for brugeren og har tekniske issues.

