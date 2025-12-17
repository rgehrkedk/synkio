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

let currentDiffs: DiffEntry[] = [];
let currentCollectionRenames: CollectionRename[] = [];
let currentModeRenames: ModeRename[] = [];
let currentHistory: SyncEvent[] = [];
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

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = (tab as HTMLElement).dataset.tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    if (targetTab === 'diff') {
      diffView.classList.add('active');
    } else {
      historyView.classList.add('active');
    }
  });
});

// Sync button
syncButton.addEventListener('click', () => {
  if (isSyncing) return;

  isSyncing = true;
  syncButton.disabled = true;
  syncIcon.textContent = '⟳';
  syncText.textContent = 'Syncing...';

  parent.postMessage({ pluginMessage: { type: 'sync' } }, '*');
});

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
        deleted: '−',
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

    // Reset sync button
    isSyncing = false;
    syncButton.disabled = false;
    syncIcon.textContent = '';
    syncText.textContent = 'Sync';
  }
};

// Tell plugin we're ready
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
