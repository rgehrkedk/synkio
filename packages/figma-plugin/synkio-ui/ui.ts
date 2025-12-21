/**
 * Synkio UI Plugin - UI Logic
 */

interface DiffEntry {
  id: string;
  name: string;
  type: 'added' | 'deleted' | 'modified' | 'renamed';
  oldName?: string;
  oldValue?: any;
  newValue?: any;
  collection: string;
  mode: string;
}

interface CollectionRename {
  oldCollection: string;
  newCollection: string;
}

interface ModeRename {
  collection: string;
  oldMode: string;
  newMode: string;
}

interface SyncEvent {
  u: string;
  t: number;
  c: number;
  p?: string[];
}

interface CollectionInfo {
  name: string;
  modeCount: number;
  excluded: boolean;
}

interface StyleTypeInfo {
  type: 'paint' | 'text' | 'effect';
  label: string;
  count: number;
  excluded: boolean;
}

let currentDiffs: DiffEntry[] = [];
let currentCollectionRenames: CollectionRename[] = [];
let currentModeRenames: ModeRename[] = [];
let currentHistory: SyncEvent[] = [];
let currentCollections: CollectionInfo[] = [];
let currentStyleTypes: StyleTypeInfo[] = [];
let isSyncing = false;

// Elements
const syncButton = document.getElementById('syncButton') as HTMLButtonElement;
const syncIcon = document.getElementById('syncIcon')!;
const syncText = document.getElementById('syncText')!;
const importButton = document.getElementById('importButton') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const statusDot = document.getElementById('statusDot')!;
const statusText = document.getElementById('statusText')!;
const diffHeader = document.getElementById('diffHeader')!;
const diffContent = document.getElementById('diffContent')!;
const historyContent = document.getElementById('historyContent')!;
const diffView = document.getElementById('diffView')!;
const historyView = document.getElementById('historyView')!;
const collectionsView = document.getElementById('collectionsView')!;
const collectionsList = document.getElementById('collectionsList')!;
const saveCollectionsBtn = document.getElementById('saveCollectionsBtn') as HTMLButtonElement;
const collectionsWarning = document.getElementById('collectionsWarning')!;
const excludedBadge = document.getElementById('excludedBadge')!;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = (tab as HTMLElement).dataset.tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    if (targetTab === 'diff') {
      diffView.classList.add('active');
    } else if (targetTab === 'history') {
      historyView.classList.add('active');
    } else if (targetTab === 'collections') {
      collectionsView.classList.add('active');
      // Request collections and style types data when switching to collections tab
      parent.postMessage({ pluginMessage: { type: 'get-collections' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'get-style-types' } }, '*');
    }
  });
});

// Sync button
syncButton.addEventListener('click', () => {
  if (isSyncing) return;

  isSyncing = true;
  syncButton.disabled = true;
  syncIcon.textContent = '...';
  syncText.textContent = 'Syncing...';

  parent.postMessage({ pluginMessage: { type: 'sync' } }, '*');
});

// Import baseline button
importButton.addEventListener('click', () => {
  fileInput.click();
});

// File input handler
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const baselineJson = event.target?.result as string;
    if (!baselineJson) return;

    importButton.disabled = true;
    importButton.textContent = 'Importing...';

    parent.postMessage({
      pluginMessage: {
        type: 'import-baseline',
        baselineJson: baselineJson
      }
    }, '*');
  };

  reader.onerror = () => {
    alert('Failed to read file');
  };

  reader.readAsText(file);

  // Reset file input
  fileInput.value = '';
});

// Save collections button - saves both variable collections and style types
saveCollectionsBtn.addEventListener('click', () => {
  // Get excluded variable collections
  const collectionCheckboxes = collectionsList.querySelectorAll('input[data-collection]') as NodeListOf<HTMLInputElement>;
  const excludedCollections: string[] = [];
  collectionCheckboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      excludedCollections.push(checkbox.dataset.collection || '');
    }
  });

  // Get excluded style types
  const styleCheckboxes = collectionsList.querySelectorAll('input[data-style-type]') as NodeListOf<HTMLInputElement>;
  const excludedStyleTypes: string[] = [];
  styleCheckboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      excludedStyleTypes.push(checkbox.dataset.styleType || '');
    }
  });

  // Validate that at least one variable collection is included (if there are any)
  if (collectionCheckboxes.length > 0 && excludedCollections.length === collectionCheckboxes.length) {
    collectionsWarning.style.display = 'block';
    return;
  }

  collectionsWarning.style.display = 'none';
  saveCollectionsBtn.disabled = true;
  saveCollectionsBtn.textContent = 'Saving...';

  // Save both collections and style types
  parent.postMessage({ pluginMessage: { type: 'save-excluded-collections', excluded: excludedCollections } }, '*');
  parent.postMessage({ pluginMessage: { type: 'save-excluded-style-types', excluded: excludedStyleTypes } }, '*');
});

// Render collections list (variable collections only)
function renderCollections(collections: CollectionInfo[]) {
  currentCollections = collections;
  updateCollectionsView();
}

// Render style types list
function renderStyleTypes(styleTypes: StyleTypeInfo[]) {
  currentStyleTypes = styleTypes;
  updateCollectionsView();
}

// Combined render for collections view (variables + styles)
function updateCollectionsView() {
  let html = '';

  // Variable Collections Section
  if (currentCollections.length > 0) {
    html += `
      <div class="section-header">Variable Collections</div>
      ${currentCollections.map(col => `
        <label class="collection-item">
          <input type="checkbox"
                 data-collection="${escapeHtml(col.name)}"
                 ${!col.excluded ? 'checked' : ''}>
          <span class="collection-name">${escapeHtml(col.name)}</span>
          <span class="mode-count">(${col.modeCount} mode${col.modeCount !== 1 ? 's' : ''})</span>
        </label>
      `).join('')}
    `;
  }

  // Style Types Section
  if (currentStyleTypes.length > 0) {
    const hasStyles = currentStyleTypes.some(st => st.count > 0);
    if (hasStyles) {
      html += `
        <div class="section-header" style="margin-top: 16px;">Style Types</div>
        ${currentStyleTypes.filter(st => st.count > 0).map(st => `
          <label class="collection-item">
            <input type="checkbox"
                   data-style-type="${st.type}"
                   ${!st.excluded ? 'checked' : ''}>
            <span class="collection-name">${escapeHtml(st.label)}</span>
            <span class="mode-count">(${st.count} style${st.count !== 1 ? 's' : ''})</span>
          </label>
        `).join('')}
      `;
    }
  }

  // Empty state if nothing
  if (currentCollections.length === 0 && currentStyleTypes.every(st => st.count === 0)) {
    html = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p>No variable collections or styles found</p>
      </div>
    `;
  }

  collectionsList.innerHTML = html;

  // Update excluded badge
  updateExcludedBadge();

  // Add change listeners to validate
  collectionsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', validateCollections);
  });
}

// Validate that at least one collection is checked
function validateCollections() {
  const checkboxes = collectionsList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

  if (checkedCount === 0) {
    collectionsWarning.style.display = 'block';
    saveCollectionsBtn.disabled = true;
  } else {
    collectionsWarning.style.display = 'none';
    saveCollectionsBtn.disabled = false;
  }
}

// Update the excluded badge in header
function updateExcludedBadge() {
  const excludedCollections = currentCollections.filter(c => c.excluded).length;
  const excludedStyles = currentStyleTypes.filter(st => st.excluded && st.count > 0).length;
  const totalExcluded = excludedCollections + excludedStyles;

  if (totalExcluded > 0) {
    excludedBadge.textContent = totalExcluded + ' excluded';
    excludedBadge.style.display = 'inline';
  } else {
    excludedBadge.style.display = 'none';
  }
}

// Render diff view
function renderDiffs(diffs: DiffEntry[], collectionRenames: CollectionRename[] = [], modeRenames: ModeRename[] = []) {
  currentDiffs = diffs;
  currentCollectionRenames = collectionRenames;
  currentModeRenames = modeRenames;

  const totalChanges = diffs.length + collectionRenames.length + modeRenames.length;
  diffHeader.textContent = `Pending Changes (${totalChanges})`;

  if (totalChanges === 0) {
    diffContent.innerHTML = `
      <div class="empty-state dashed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <p>Everything is up to date</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Render collection renames first (most significant)
  if (collectionRenames.length > 0) {
    html += `<div class="rename-section">
      <div class="rename-section-header">Collection Renames (${collectionRenames.length})</div>
      ${collectionRenames.map(rename => `
        <div class="diff-item">
          <div class="diff-header">
            <div class="diff-badge renamed">↔</div>
            <div class="diff-info">
              <div class="diff-name">${rename.oldCollection} → ${rename.newCollection}</div>
              <div class="diff-collection">Collection renamed</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  // Render mode renames
  if (modeRenames.length > 0) {
    html += `<div class="rename-section">
      <div class="rename-section-header">Mode Renames (${modeRenames.length})</div>
      ${modeRenames.map(rename => `
        <div class="diff-item">
          <div class="diff-header">
            <div class="diff-badge renamed">↔</div>
            <div class="diff-info">
              <div class="diff-name">${rename.oldMode} → ${rename.newMode}</div>
              <div class="diff-collection">${rename.collection}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  // Render token diffs
  if (diffs.length > 0) {
    html += diffs.map(diff => {
      const iconMap: Record<string, string> = {
        added: '+',
        modified: '~',
        deleted: '-',
        renamed: '↔'
      };

      let valuesHtml = '';
      if (diff.type === 'renamed') {
        // Show old name → new name
        valuesHtml = `
          <div class="diff-values">
            <span class="old">${diff.oldName}</span>
            <span class="arrow">→</span>
            <span class="new">${diff.name}</span>
          </div>
        `;
        // If value also changed, show that too
        if (diff.oldValue !== undefined && diff.newValue !== undefined) {
          valuesHtml += `
            <div class="diff-values">
              <span class="old">${formatValue(diff.oldValue)}</span>
              <span class="arrow">→</span>
              <span class="new">${formatValue(diff.newValue)}</span>
            </div>
          `;
        }
      } else if (diff.type === 'modified') {
        valuesHtml = `
          <div class="diff-values">
            <span class="old">${formatValue(diff.oldValue)}</span>
            <span class="arrow">→</span>
            <span class="new">${formatValue(diff.newValue)}</span>
          </div>
        `;
      } else if (diff.type === 'added') {
        valuesHtml = `
          <div class="diff-values">
            <span style="font-size: 9px; text-transform: uppercase; color: #999;">Value:</span>
            <span class="new">${formatValue(diff.newValue)}</span>
          </div>
        `;
      }

      // For renamed, show new name in header; for others show current name
      const displayName = diff.type === 'renamed' ? diff.name : diff.name;

      return `
        <div class="diff-item">
          <div class="diff-header">
            <div class="diff-badge ${diff.type}">${iconMap[diff.type]}</div>
            <div class="diff-info">
              <div class="diff-name">${displayName}</div>
              <div class="diff-collection">${diff.collection}</div>
            </div>
          </div>
          ${valuesHtml}
        </div>
      `;
    }).join('');
  }

  diffContent.innerHTML = `<div class="diff-list">${html}</div>`;
}

// Render history
function renderHistory(history: SyncEvent[]) {
  currentHistory = history;

  if (history.length === 0) {
    historyContent.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p>No sync history found</p>
      </div>
    `;
    return;
  }

  const html = history.map((event, index) => {
    const initial = event.u.charAt(0).toUpperCase();
    const timeAgo = formatTimeAgo(event.t);
    const hasChanges = event.p && event.p.length > 0;

    const changesHtml = hasChanges ? `
      <div class="history-changes" id="changes-${index}" style="display: none;">
        ${event.p!.map(path => `<div class="history-change-item">${escapeHtml(path)}</div>`).join('')}
      </div>
    ` : '';

    return `
      <div class="history-item ${hasChanges ? 'expandable' : ''}" ${hasChanges ? `onclick="toggleChanges(${index})"` : ''}>
        <div class="history-avatar">${initial}</div>
        <div class="history-details">
          <div class="history-header">
            <span class="history-user">${event.u}</span>
            <span class="history-time">${timeAgo}</span>
          </div>
          <div class="history-action">
            Synced ${event.c} ${event.c === 1 ? 'change' : 'changes'}
            ${hasChanges ? '<span class="expand-icon" id="icon-' + index + '">▶</span>' : ''}
          </div>
        </div>
      </div>
      ${changesHtml}
    `;
  }).join('');

  historyContent.innerHTML = `<div class="history-list">${html}</div>`;
}

// Toggle history changes visibility
function toggleChanges(index: number) {
  const changesEl = document.getElementById('changes-' + index);
  const iconEl = document.getElementById('icon-' + index);
  if (changesEl && iconEl) {
    const isHidden = changesEl.style.display === 'none';
    changesEl.style.display = isHidden ? 'block' : 'none';
    iconEl.textContent = isHidden ? '▼' : '▶';
  }
}

// Make toggleChanges available globally for onclick
(window as any).toggleChanges = toggleChanges;

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format value for display
function formatValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Format timestamp to relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// Update status indicator
function updateStatus(diffCount: number) {
  if (diffCount > 0) {
    statusDot.className = 'status-dot unsynced';
    statusText.textContent = 'Unsynced changes';
  } else {
    statusDot.className = 'status-dot synced';
    statusText.textContent = 'Synced';
  }
}

// Handle messages from plugin
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;

  if (msg && msg.type === 'update') {
    const totalChanges = msg.diffs.length + (msg.collectionRenames?.length || 0) + (msg.modeRenames?.length || 0);
    renderDiffs(msg.diffs, msg.collectionRenames || [], msg.modeRenames || []);
    renderHistory(msg.history);
    updateStatus(totalChanges);

    // Update excluded badge if we have collection info
    if (msg.excludedCount !== undefined) {
      if (msg.excludedCount > 0) {
        excludedBadge.textContent = msg.excludedCount + ' excluded';
        excludedBadge.style.display = 'inline';
      } else {
        excludedBadge.style.display = 'none';
      }
    }

    // Reset sync button
    isSyncing = false;
    syncButton.disabled = false;
    syncIcon.textContent = '';
    syncText.textContent = 'Sync';
  }

  if (msg && msg.type === 'collections-update') {
    renderCollections(msg.collections);
  }

  if (msg && msg.type === 'style-types-update') {
    renderStyleTypes(msg.styleTypes);
  }

  if (msg && msg.type === 'style-types-saved') {
    // Style types saved - the collections-saved handler will reset the button
  }

  if (msg && msg.type === 'collections-saved') {
    saveCollectionsBtn.disabled = false;
    saveCollectionsBtn.textContent = 'Save';

    // Show success feedback briefly
    const originalText = saveCollectionsBtn.textContent;
    saveCollectionsBtn.textContent = 'Saved!';
    saveCollectionsBtn.style.background = '#10b981';
    setTimeout(() => {
      saveCollectionsBtn.textContent = originalText;
      saveCollectionsBtn.style.background = '';
    }, 1500);

    // Update internal state and badge from current checkboxes
    const collectionCheckboxes = collectionsList.querySelectorAll('input[data-collection]') as NodeListOf<HTMLInputElement>;
    collectionCheckboxes.forEach(cb => {
      const col = currentCollections.find(c => c.name === cb.dataset.collection);
      if (col) col.excluded = !cb.checked;
    });

    const styleCheckboxes = collectionsList.querySelectorAll('input[data-style-type]') as NodeListOf<HTMLInputElement>;
    styleCheckboxes.forEach(cb => {
      const st = currentStyleTypes.find(s => s.type === cb.dataset.styleType);
      if (st) st.excluded = !cb.checked;
    });

    updateExcludedBadge();
  }

  if (msg && msg.type === 'import-success') {
    importButton.disabled = false;
    importButton.innerHTML = '<span>📥</span><span>Import Baseline</span>';

    // Show success feedback briefly
    importButton.innerHTML = '<span>✅</span><span>Imported!</span>';
    importButton.style.background = '#10b981';
    importButton.style.color = 'white';
    importButton.style.borderColor = '#10b981';
    setTimeout(() => {
      importButton.innerHTML = '<span>📥</span><span>Import Baseline</span>';
      importButton.style.background = '';
      importButton.style.color = '';
      importButton.style.borderColor = '';
    }, 2000);
  }

  if (msg && msg.type === 'import-error') {
    importButton.disabled = false;
    importButton.innerHTML = '<span>📥</span><span>Import Baseline</span>';
    alert('Import failed: ' + msg.error);
  }
};

// Tell plugin we're ready
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
