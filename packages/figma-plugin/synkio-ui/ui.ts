/**
 * Synkio UI Plugin - UI Logic
 */

console.log('=== UI.JS LOADING ===');

interface DiffEntry {
  id: string;
  name: string;
  type: 'added' | 'deleted' | 'modified';
  oldValue?: any;
  newValue?: any;
  collection: string;
  mode: string;
}

interface SyncEvent {
  u: string;
  t: number;
  c: number;
}

let currentDiffs: DiffEntry[] = [];
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
  console.log('Sync button clicked');
  if (isSyncing) {
    console.log('Already syncing, ignoring');
    return;
  }

  isSyncing = true;
  syncButton.disabled = true;
  syncIcon.textContent = '⟳';
  syncText.textContent = 'Syncing...';

  console.log('Sending sync message to plugin');
  parent.postMessage({ pluginMessage: { type: 'sync' } }, '*');
});

// Render diff view
function renderDiffs(diffs: DiffEntry[]) {
  currentDiffs = diffs;

  diffHeader.textContent = `Pending Changes (${diffs.length})`;

  if (diffs.length === 0) {
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

  const html = diffs.map(diff => {
    const iconMap = {
      added: '+',
      modified: '~',
      deleted: '−'
    };

    let valuesHtml = '';
    if (diff.type === 'modified') {
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

    return `
      <div class="diff-item">
        <div class="diff-header">
          <div class="diff-badge ${diff.type}">${iconMap[diff.type]}</div>
          <div class="diff-info">
            <div class="diff-name">${diff.name}</div>
            <div class="diff-collection">${diff.collection}</div>
          </div>
        </div>
        ${valuesHtml}
      </div>
    `;
  }).join('');

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

  const html = history.map(event => {
    const initial = event.u.charAt(0).toUpperCase();
    const timeAgo = formatTimeAgo(event.t);

    return `
      <div class="history-item">
        <div class="history-avatar">${initial}</div>
        <div class="history-details">
          <div class="history-header">
            <span class="history-user">${event.u}</span>
            <span class="history-time">${timeAgo}</span>
          </div>
          <div class="history-action">Synced ${event.c} ${event.c === 1 ? 'change' : 'changes'}</div>
        </div>
      </div>
    `;
  }).join('');

  historyContent.innerHTML = `<div class="history-list">${html}</div>`;
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
console.log('Setting up window.onmessage handler');
window.onmessage = (event) => {
  console.log('=== UI RECEIVED MESSAGE ===');
  console.log('Event:', event);
  console.log('Event data:', event.data);
  console.log('Plugin message:', event.data.pluginMessage);

  const msg = event.data.pluginMessage;

  if (msg && msg.type === 'update') {
    console.log('Update received, diffs:', msg.diffs.length, 'history:', msg.history.length);
    renderDiffs(msg.diffs);
    renderHistory(msg.history);
    updateStatus(msg.diffs.length);

    // Reset sync button
    isSyncing = false;
    syncButton.disabled = false;
    syncIcon.textContent = '✓';
    syncText.textContent = 'Sync';
  } else {
    console.log('Message was not an update, msg:', msg);
  }
};

// Initialize
console.log('UI loaded, waiting for plugin data...');
console.log('DOM ready, elements:', { syncButton, statusDot, statusText });

// Tell plugin we're ready
console.log('Sending ready message to plugin');
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
