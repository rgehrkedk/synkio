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

let currentDiffs: DiffEntry[] = [];
let currentCollectionRenames: CollectionRename[] = [];
let currentModeRenames: ModeRename[] = [];
let currentHistory: SyncEvent[] = [];
let currentCollections: CollectionInfo[] = [];
let isSyncing = false;

// Elements
const syncButton = document.getElementById('syncButton') as HTMLButtonElement;
const syncIcon = document.getElementById('syncIcon')!;
const syncText = document.getElementById('syncText')!;
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
      // Request collections data when switching to collections tab
      parent.postMessage({ pluginMessage: { type: 'get-collections' } }, '*');
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

// Save collections button
saveCollectionsBtn.addEventListener('click', () => {
  const checkboxes = collectionsList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const excluded: string[] = [];

  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      excluded.push(checkbox.dataset.collection || '');
    }
  });

  // Validate that at least one collection is included
  if (excluded.length === checkboxes.length) {
    collectionsWarning.style.display = 'block';
    return;
  }

  collectionsWarning.style.display = 'none';
  saveCollectionsBtn.disabled = true;
  saveCollectionsBtn.textContent = 'Saving...';

  parent.postMessage({ pluginMessage: { type: 'save-excluded-collections', excluded } }, '*');
});

// Render collections list
function renderCollections(collections: CollectionInfo[]) {
  currentCollections = collections;

  if (collections.length === 0) {
    collectionsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p>No variable collections found</p>
      </div>
    `;
    return;
  }

  const html = collections.map(col => `
    <label class="collection-item">
      <input type="checkbox"
             data-collection="${escapeHtml(col.name)}"
             ${!col.excluded ? 'checked' : ''}>
      <span class="collection-name">${escapeHtml(col.name)}</span>
      <span class="mode-count">(${col.modeCount} mode${col.modeCount !== 1 ? 's' : ''})</span>
    </label>
  `).join('');

  collectionsList.innerHTML = html;

  // Update excluded badge
  updateExcludedBadge(collections);

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
function updateExcludedBadge(collections: CollectionInfo[]) {
  const excludedCount = collections.filter(c => c.excluded).length;
  if (excludedCount > 0) {
    excludedBadge.textContent = excludedCount + ' excluded';
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

    // Update the excluded badge
    const checkboxes = collectionsList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    const excludedCount = Array.from(checkboxes).filter(cb => !cb.checked).length;
    if (excludedCount > 0) {
      excludedBadge.textContent = excludedCount + ' excluded';
      excludedBadge.style.display = 'inline';
    } else {
      excludedBadge.style.display = 'none';
    }
  }
};

// Tell plugin we're ready
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
