# Collection Exclusion - Figma Plugin (synkio-ui)

## Problem

Designers want to exclude certain collections from being synced to code (e.g., `_responsive`, internal/WIP collections). Currently there's no way to control what gets exported.

## Solution

Add a "Collections" navigation tab in synkio-ui plugin where designers can:
1. See all collections from the Figma file
2. Toggle collections on/off for export
3. Save preferences to `sharedPluginData` (persists across all users)

## User Flow

1. Designer opens synkio-ui plugin
2. Clicks "Collections" tab (new, alongside Diff/History)
3. Sees list of all collections with checkboxes
4. Unchecks collections to exclude (e.g., `_responsive`)
5. Clicks "Save" button
6. Exclusions are saved and apply to all future syncs

## UI Design

```
┌─────────────────────────────────────────────┐
│ Synkio                           [v1.x.x]   │
│ ● Ready                          [Sync]     │
├─────────────────────────────────────────────┤
│ [Diff] [History] [Collections]              │  ← New tab
├─────────────────────────────────────────────┤
│                                             │
│  Collections                                │
│  Select which collections to sync           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☑ brand (3 modes)                   │   │
│  │ ☑ globals (1 mode)                  │   │
│  │ ☑ theme (5 modes)                   │   │
│  │ ☐ _responsive (4 modes)             │   │  ← Unchecked = excluded
│  └─────────────────────────────────────┘   │
│                                             │
│  [Save]                                     │
│                                             │
└─────────────────────────────────────────────┘
```

## Data Storage

### Key in sharedPluginData

Store under `synkio` namespace with key `excludedCollections`:

```typescript
// Save
figma.root.setSharedPluginData('synkio', 'excludedCollections', JSON.stringify(['_responsive']));

// Load
const excluded = JSON.parse(
  figma.root.getSharedPluginData('synkio', 'excludedCollections') || '[]'
);
```

### Data Format

```json
["_responsive", "_deprecated"]
```

Simple array of collection names to exclude. Empty array `[]` means include all.

## Implementation

### 1. Update UI Template (ui.template.html)

Add third tab button:
```html
<button class="tab-btn" data-tab="collections">Collections</button>
```

Add collections view section:
```html
<div id="collections-view" class="tab-content" style="display: none;">
  <div class="collections-header">
    <h3>Collections</h3>
    <p class="subtitle">Select which collections to sync</p>
  </div>
  <div id="collections-list" class="collections-list">
    <!-- Populated dynamically -->
  </div>
  <button id="save-collections-btn" class="save-btn">Save</button>
</div>
```

### 2. Update UI Logic (ui.ts)

Add state and handlers:
```typescript
interface CollectionInfo {
  name: string;
  modeCount: number;
  excluded: boolean;
}

let collections: CollectionInfo[] = [];

// Handle collections tab click
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'collections') {
      parent.postMessage({ pluginMessage: { type: 'get-collections' } }, '*');
    }
    // ... existing tab logic
  });
});

// Render collections list
function renderCollections(data: { collections: CollectionInfo[] }) {
  const container = document.getElementById('collections-list');
  container.innerHTML = data.collections.map(col => `
    <label class="collection-item">
      <input type="checkbox"
             data-collection="${col.name}"
             ${!col.excluded ? 'checked' : ''}>
      <span class="collection-name">${col.name}</span>
      <span class="mode-count">(${col.modeCount} mode${col.modeCount !== 1 ? 's' : ''})</span>
    </label>
  `).join('');
}

// Save button handler
document.getElementById('save-collections-btn').addEventListener('click', () => {
  const excluded = Array.from(document.querySelectorAll('.collection-item input:not(:checked)'))
    .map(input => input.dataset.collection);
  parent.postMessage({ pluginMessage: { type: 'save-excluded-collections', excluded } }, '*');
});
```

### 3. Update Plugin Code (code.ts)

Add message handlers:
```typescript
// Get all collections with exclusion status
case 'get-collections': {
  const collections = figma.variables.getLocalVariableCollections();
  const excludedJson = figma.root.getSharedPluginData('synkio', 'excludedCollections');
  const excluded: string[] = excludedJson ? JSON.parse(excludedJson) : [];

  const collectionInfos = collections.map(col => ({
    name: col.name,
    modeCount: col.modes.length,
    excluded: excluded.includes(col.name)
  }));

  figma.ui.postMessage({
    type: 'collections-update',
    collections: collectionInfos
  });
  break;
}

// Save excluded collections
case 'save-excluded-collections': {
  const { excluded } = msg;
  figma.root.setSharedPluginData('synkio', 'excludedCollections', JSON.stringify(excluded));
  figma.ui.postMessage({ type: 'collections-saved' });
  break;
}
```

### 4. Filter Collections During Sync

Modify `collectCurrentTokens()` in code.ts:
```typescript
async function collectCurrentTokens(): Promise<SyncData> {
  const collections = figma.variables.getLocalVariableCollections();

  // Load excluded collections
  const excludedJson = figma.root.getSharedPluginData('synkio', 'excludedCollections');
  const excludedCollections: string[] = excludedJson ? JSON.parse(excludedJson) : [];

  // Filter out excluded collections
  const activeCollections = collections.filter(col => !excludedCollections.includes(col.name));

  const tokens: TokenEntry[] = [];

  for (const collection of activeCollections) {
    // ... existing token collection logic
  }

  return { version: '2.0.0', timestamp: new Date().toISOString(), tokens };
}
```

### 5. Show Exclusion Status in UI

Update status indicator or add info text when collections are excluded:
```typescript
// After loading collections, show count if any excluded
const excludedCount = collections.filter(c => c.excluded).length;
if (excludedCount > 0) {
  // Show subtle indicator: "2 collections excluded"
}
```

## Files to Modify

1. `packages/figma-plugin/synkio-ui/ui.template.html` - Add Collections tab and content
2. `packages/figma-plugin/synkio-ui/ui.ts` - Add collections state, rendering, save logic
3. `packages/figma-plugin/synkio-ui/code.ts` - Add message handlers, filter during sync
4. `packages/figma-plugin/synkio-ui/styles.css` - Add styles for collections list

## CSS Styles

```css
.collections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--figma-color-bg-secondary);
  border-radius: 6px;
  margin: 12px 0;
}

.collection-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
}

.collection-item:hover {
  background: var(--figma-color-bg-hover);
}

.collection-name {
  flex: 1;
  font-weight: 500;
}

.mode-count {
  color: var(--figma-color-text-secondary);
  font-size: 11px;
}

.save-btn {
  width: 100%;
  padding: 10px;
  background: var(--figma-color-bg-brand);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--figma-color-bg-brand-hover);
}
```

## Message Types

Add to types:
```typescript
// UI → Plugin
type UIMessage =
  | { type: 'ready' }
  | { type: 'sync' }
  | { type: 'get-collections' }
  | { type: 'save-excluded-collections'; excluded: string[] };

// Plugin → UI
type PluginMessage =
  | { type: 'update'; diffs: SimpleDiff[]; history: SyncEvent[]; hasBaseline: boolean }
  | { type: 'collections-update'; collections: CollectionInfo[] }
  | { type: 'collections-saved' };
```

## Acceptance Criteria

- [ ] New "Collections" tab appears in navigation
- [ ] All Figma variable collections are listed with mode counts
- [ ] Checkboxes toggle exclusion state
- [ ] "Save" persists exclusions to sharedPluginData
- [ ] Excluded collections are filtered out during sync
- [ ] Settings persist across plugin reopens
- [ ] Settings persist across different users (shared via sharedPluginData)
- [ ] Diff view only shows tokens from included collections
- [ ] Clear feedback when settings are saved

## Edge Cases

1. **No collections in file** - Show empty state: "No variable collections found"
2. **All collections excluded** - Show warning: "At least one collection must be included"
3. **Collection renamed in Figma** - Old exclusion entries become orphaned (harmless)
4. **New collection added** - Automatically included (not in exclusion list)
