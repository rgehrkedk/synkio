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

interface RemoteSettings {
  sourceType: 'disabled' | 'github' | 'url' | 'localhost';
  github?: {
    repo: string;
    branch: string;
    path: string;
    token?: string;
  };
  customUrl?: string;
  localhostUrl?: string;
  localhostToken?: string;
  autoCheck?: boolean;
}

interface RemoteStatus {
  state: 'idle' | 'fetching' | 'checking' | 'error';
  lastFetched?: number;
  error?: string;
  updatesAvailable?: number;
}

// State for diff tabs
let activeDiffTab: 'sync' | 'code' = 'sync';
let syncDiffs: DiffEntry[] = [];
let syncCollectionRenames: CollectionRename[] = [];
let syncModeRenames: ModeRename[] = [];
let syncTimestamp: number | undefined;
let codeDiffs: DiffEntry[] = [];
let codeCollectionRenames: CollectionRename[] = [];
let codeModeRenames: ModeRename[] = [];
let codeTimestamp: number | undefined;
let codeSource: string | undefined;  // "fetch", "import", etc.
let codeSourceUrl: string | undefined;

let currentDiffs: DiffEntry[] = [];
let currentCollectionRenames: CollectionRename[] = [];
let currentModeRenames: ModeRename[] = [];
let currentHistory: SyncEvent[] = [];
let currentCollections: CollectionInfo[] = [];
let currentStyleTypes: StyleTypeInfo[] = [];
let isSyncing = false;
let remoteStatus: RemoteStatus = { state: 'idle' };
let remoteSettings: RemoteSettings = { sourceType: 'disabled' };

// Elements
const syncButton = document.getElementById('syncButton') as HTMLButtonElement;
const syncIcon = document.getElementById('syncIcon')!;
const syncText = document.getElementById('syncText')!;
const importButton = document.getElementById('importButton') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const applyButton = document.getElementById('applyButton') as HTMLButtonElement;
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

// Diff tab elements
const syncDiffView = document.getElementById('syncDiffView')!;
const codeDiffView = document.getElementById('codeDiffView')!;
const syncDiffHeader = document.getElementById('syncDiffHeader')!;
const codeDiffHeader = document.getElementById('codeDiffHeader')!;
const syncDiffContent = document.getElementById('syncDiffContent')!;
const codeDiffContent = document.getElementById('codeDiffContent')!;
const syncTabBadge = document.getElementById('syncTabBadge')!;
const codeTabBadge = document.getElementById('codeTabBadge')!;

// Remote sync elements
const remoteStatusEl = document.getElementById('remote-status')!;
const fetchBtn = document.getElementById('fetch-btn') as HTMLButtonElement;
const checkBtn = document.getElementById('check-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel')!;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const saveSettingsBtn = document.getElementById('save-settings-btn') as HTMLButtonElement;
const testConnectionBtn = document.getElementById('test-connection-btn') as HTMLButtonElement;

// Remote sync functions
function updateRemoteStatus() {
  const { state, lastFetched, error, updatesAvailable } = remoteStatus;

  if (remoteSettings.sourceType === 'disabled') {
    remoteStatusEl.innerHTML = `
      <span style="color: #999; font-size: 11px;">Remote sync disabled</span>
    `;
    fetchBtn.disabled = true;
    checkBtn.disabled = true;
    return;
  }

  fetchBtn.disabled = false;
  checkBtn.disabled = false;

  if (state === 'fetching') {
    remoteStatusEl.innerHTML = `
      <span style="color: #666; font-size: 11px;">⏳ Fetching from remote...</span>
    `;
    fetchBtn.disabled = true;
    checkBtn.disabled = true;
  } else if (state === 'checking') {
    remoteStatusEl.innerHTML = `
      <span style="color: #666; font-size: 11px;">🔍 Checking for updates...</span>
    `;
    checkBtn.disabled = true;
  } else if (state === 'error') {
    remoteStatusEl.innerHTML = `
      <span style="color: #dc2626; font-size: 11px;">❌ ${escapeHtml(error || 'Failed to fetch')}</span>
    `;
  } else if (updatesAvailable !== undefined && updatesAvailable > 0) {
    remoteStatusEl.innerHTML = `
      <span style="color: #ea580c; font-size: 11px;">
        ${updatesAvailable} update${updatesAvailable !== 1 ? 's' : ''} available
      </span>
    `;
  } else if (lastFetched) {
    const timeAgo = formatTimeAgo(lastFetched);
    remoteStatusEl.innerHTML = `
      <span style="color: #10b981; font-size: 11px;">✓ Up to date • Last fetched ${timeAgo}</span>
    `;
  } else {
    remoteStatusEl.innerHTML = `
      <span style="color: #999; font-size: 11px;">Ready to fetch</span>
    `;
  }
}

function showSettingsPanel() {
  settingsPanel.classList.remove('hidden');
  // Request current settings from code.ts
  parent.postMessage({ pluginMessage: { type: 'get-settings' } }, '*');
}

function hideSettingsPanel() {
  settingsPanel.classList.add('hidden');
}

function updateSourceTypeVisibility() {
  const sourceType = (document.querySelector('input[name="source-type"]:checked') as HTMLInputElement)?.value;

  document.getElementById('github-settings')!.classList.toggle('hidden', sourceType !== 'github');
  document.getElementById('url-settings')!.classList.toggle('hidden', sourceType !== 'url');
  document.getElementById('localhost-settings')!.classList.toggle('hidden', sourceType !== 'localhost');
}

function populateSettingsForm(settings: RemoteSettings) {
  remoteSettings = settings;

  // Set source type
  const sourceTypeRadio = document.querySelector(`input[name="source-type"][value="${settings.sourceType}"]`) as HTMLInputElement;
  if (sourceTypeRadio) sourceTypeRadio.checked = true;

  // GitHub settings
  if (settings.github) {
    (document.getElementById('github-repo') as HTMLInputElement).value = settings.github.repo || '';
    (document.getElementById('github-branch') as HTMLInputElement).value = settings.github.branch || 'main';
    (document.getElementById('github-path') as HTMLInputElement).value = settings.github.path || '.synkio/export-baseline.json';
    (document.getElementById('github-token') as HTMLInputElement).value = settings.github.token || '';
  }

  // Custom URL
  if (settings.customUrl) {
    (document.getElementById('custom-url') as HTMLInputElement).value = settings.customUrl;
  }

  // Localhost settings
  if (settings.localhostUrl) {
    (document.getElementById('localhost-url') as HTMLInputElement).value = settings.localhostUrl;
  }
  if (settings.localhostToken) {
    (document.getElementById('localhost-token') as HTMLInputElement).value = settings.localhostToken;
  }

  // Auto check
  (document.getElementById('auto-check') as HTMLInputElement).checked = settings.autoCheck || false;

  updateSourceTypeVisibility();
}

// Tab switching (main navigation: Diff/History/Collections)
document.querySelectorAll('[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = (tab as HTMLElement).dataset.tab;

    // Only update main navigation tabs (not diff sub-tabs)
    document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
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

// Diff tab switching (Sync vs Code)
document.querySelectorAll('[data-diff-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetDiffTab = (tab as HTMLElement).dataset.diffTab as 'sync' | 'code';

    activeDiffTab = targetDiffTab;

    // Update tab active states
    document.querySelectorAll('[data-diff-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update view visibility
    syncDiffView.classList.toggle('active', targetDiffTab === 'sync');
    codeDiffView.classList.toggle('active', targetDiffTab === 'code');

    // Re-render current view
    renderDiffs();
  });
});

// Remote sync button handlers
fetchBtn.addEventListener('click', async () => {
  remoteStatus.state = 'fetching';
  updateRemoteStatus();

  // For localhost/tunnel, fetch directly from UI
  if (remoteSettings.sourceType === 'localhost') {
    const baseUrl = remoteSettings.localhostUrl;
    if (!baseUrl) {
      remoteStatus.state = 'error';
      remoteStatus.error = 'Server URL not configured. Go to Settings.';
      updateRemoteStatus();
      return;
    }

    try {
      const token = remoteSettings.localhostToken;
      let url = baseUrl;
      if (token) {
        url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }

      console.log('[Synkio] Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'X-Synkio-Token': token } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or missing token');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Send the fetched data to the backend for processing
      parent.postMessage({ pluginMessage: { type: 'process-remote-data', data } }, '*');
    } catch (error: any) {
      remoteStatus.state = 'error';
      remoteStatus.error = error.message?.includes('Failed to fetch') || error.message?.includes('Content Security Policy')
        ? 'Cannot connect. Use an HTTPS tunnel (e.g., ngrok).'
        : error.message;
      updateRemoteStatus();
    }
  } else {
    // For GitHub/URL, let the backend handle it
    parent.postMessage({ pluginMessage: { type: 'fetch-remote' } }, '*');
  }
});

checkBtn.addEventListener('click', () => {
  remoteStatus.state = 'checking';
  updateRemoteStatus();
  parent.postMessage({ pluginMessage: { type: 'check-for-updates' } }, '*');
});

settingsBtn.addEventListener('click', () => {
  showSettingsPanel();
});

backBtn.addEventListener('click', () => {
  hideSettingsPanel();
});

// Source type radio change handler
document.querySelectorAll('input[name="source-type"]').forEach(radio => {
  radio.addEventListener('change', updateSourceTypeVisibility);
});

testConnectionBtn.addEventListener('click', () => {
  const repo = (document.getElementById('github-repo') as HTMLInputElement).value;
  const branch = (document.getElementById('github-branch') as HTMLInputElement).value;
  const path = (document.getElementById('github-path') as HTMLInputElement).value;
  const token = (document.getElementById('github-token') as HTMLInputElement).value;

  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = 'Testing...';

  parent.postMessage({
    pluginMessage: {
      type: 'test-github-connection',
      github: { repo, branch, path, token }
    }
  }, '*');
});

saveSettingsBtn.addEventListener('click', () => {
  const sourceType = (document.querySelector('input[name="source-type"]:checked') as HTMLInputElement)?.value as RemoteSettings['sourceType'];

  const settings: RemoteSettings = {
    sourceType,
    autoCheck: (document.getElementById('auto-check') as HTMLInputElement).checked
  };

  if (sourceType === 'github') {
    settings.github = {
      repo: (document.getElementById('github-repo') as HTMLInputElement).value,
      branch: (document.getElementById('github-branch') as HTMLInputElement).value,
      path: (document.getElementById('github-path') as HTMLInputElement).value,
      token: (document.getElementById('github-token') as HTMLInputElement).value || undefined
    };
  } else if (sourceType === 'url') {
    settings.customUrl = (document.getElementById('custom-url') as HTMLInputElement).value;
  } else if (sourceType === 'localhost') {
    settings.localhostUrl = (document.getElementById('localhost-url') as HTMLInputElement).value || undefined;
    settings.localhostToken = (document.getElementById('localhost-token') as HTMLInputElement).value || undefined;
  }

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.textContent = 'Saving...';

  parent.postMessage({
    pluginMessage: {
      type: 'save-settings',
      settings
    }
  }, '*');
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

// Apply to Figma button
applyButton.addEventListener('click', () => {
  applyButton.disabled = true;
  applyButton.innerHTML = '<span>⏳</span><span>Applying...</span>';

  parent.postMessage({
    pluginMessage: {
      type: 'apply-to-figma'
    }
  }, '*');
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

// Render diff view - delegates to specific tab renderers
function renderDiffs() {
  renderSyncDiffs();
  renderCodeDiffs();
  updateDiffBadges();
}

// Render sync diffs (Changes Since Last Sync)
function renderSyncDiffs() {
  const diffs = syncDiffs;
  const collectionRenames = syncCollectionRenames;
  const modeRenames = syncModeRenames;

  const totalChanges = diffs.length + collectionRenames.length + modeRenames.length;
  syncDiffHeader.textContent = `Changes Since Last Sync (${totalChanges})`;

  // Show timestamp if available
  let timestampHtml = '';
  if (syncTimestamp) {
    const timeAgo = formatTimeAgo(syncTimestamp);
    timestampHtml = `
      <div style="font-size: 10px; color: #999; margin-bottom: 12px; padding: 0 4px;">
        Last synced: ${timeAgo}
      </div>
    `;
  }

  if (totalChanges === 0) {
    syncDiffContent.innerHTML = `
      ${timestampHtml}
      <div class="empty-state dashed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <p>No changes since last sync</p>
      </div>
    `;
    return;
  }

  syncDiffContent.innerHTML = `${timestampHtml}<div class="diff-list">${renderDiffContent(diffs, collectionRenames, modeRenames)}</div>`;
}

// Render code diffs (Compare with Code)
function renderCodeDiffs() {
  const diffs = codeDiffs;
  const collectionRenames = codeCollectionRenames;
  const modeRenames = codeModeRenames;

  const totalChanges = diffs.length + collectionRenames.length + modeRenames.length;
  codeDiffHeader.textContent = `Compare with Code (${totalChanges})`;

  // Show source and timestamp if available
  let metadataHtml = '';
  if (codeTimestamp || codeSource || codeSourceUrl) {
    const parts: string[] = [];

    if (codeSource === 'fetch' && codeSourceUrl) {
      parts.push(`Source: <a href="${escapeHtml(codeSourceUrl)}" target="_blank" style="color: #18A0FB; text-decoration: none;">${escapeHtml(codeSourceUrl)}</a>`);
    } else if (codeSource === 'import') {
      parts.push('Imported from file');
    }

    if (codeTimestamp) {
      const timeAgo = formatTimeAgo(codeTimestamp);
      parts.push(`Last fetched: ${timeAgo}`);
    }

    if (parts.length > 0) {
      metadataHtml = `
        <div style="font-size: 10px; color: #999; margin-bottom: 12px; padding: 0 4px;">
          ${parts.join(' • ')}
        </div>
      `;
    }
  }

  // Check if we have no code baseline at all
  if (totalChanges === 0 && !codeTimestamp) {
    codeDiffContent.innerHTML = `
      <div class="empty-state dashed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <p>Fetch tokens to compare with Figma</p>
        <button class="btn btn-secondary" style="margin-top: 12px;" onclick="document.getElementById('fetch-btn').click()">Fetch Latest</button>
      </div>
    `;
    return;
  }

  if (totalChanges === 0) {
    codeDiffContent.innerHTML = `
      ${metadataHtml}
      <div class="empty-state dashed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <p>Figma matches your code tokens</p>
      </div>
    `;
    return;
  }

  codeDiffContent.innerHTML = `${metadataHtml}<div class="diff-list">${renderDiffContent(diffs, collectionRenames, modeRenames)}</div>`;
}

// Shared diff content rendering logic
function renderDiffContent(diffs: DiffEntry[], collectionRenames: CollectionRename[], modeRenames: ModeRename[]): string {
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

  return html;
}

// Update badge counts for diff tabs
function updateDiffBadges() {
  const syncTotal = syncDiffs.length + syncCollectionRenames.length + syncModeRenames.length;
  const codeTotal = codeDiffs.length + codeCollectionRenames.length + codeModeRenames.length;

  if (syncTotal > 0) {
    syncTabBadge.textContent = String(syncTotal);
    syncTabBadge.style.display = 'inline';
  } else {
    syncTabBadge.style.display = 'none';
  }

  if (codeTotal > 0) {
    codeTabBadge.textContent = String(codeTotal);
    codeTabBadge.style.display = 'inline';
  } else {
    codeTabBadge.style.display = 'none';
  }
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

  // Legacy 'update' message - maps to sync diffs for backward compatibility
  if (msg && msg.type === 'update') {
    syncDiffs = msg.diffs || [];
    syncCollectionRenames = msg.collectionRenames || [];
    syncModeRenames = msg.modeRenames || [];

    const totalChanges = syncDiffs.length + syncCollectionRenames.length + syncModeRenames.length;
    renderDiffs();
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

  // New message type: update-sync-diffs (Changes Since Sync)
  if (msg && msg.type === 'update-sync-diffs') {
    syncDiffs = msg.diffs || [];
    syncCollectionRenames = msg.collectionRenames || [];
    syncModeRenames = msg.modeRenames || [];
    syncTimestamp = msg.timestamp;

    renderDiffs();

    const totalChanges = syncDiffs.length + syncCollectionRenames.length + syncModeRenames.length;
    updateStatus(totalChanges);

    // Reset sync button
    isSyncing = false;
    syncButton.disabled = false;
    syncIcon.textContent = '';
    syncText.textContent = 'Sync';

    // Auto-switch to sync tab if it has new changes
    if (totalChanges > 0 && activeDiffTab !== 'sync') {
      activeDiffTab = 'sync';
      document.querySelectorAll('[data-diff-tab]').forEach(t => t.classList.remove('active'));
      document.querySelector('[data-diff-tab="sync"]')?.classList.add('active');
      syncDiffView.classList.add('active');
      codeDiffView.classList.remove('active');
    }
  }

  // New message type: update-code-diffs (Compare with Code)
  if (msg && msg.type === 'update-code-diffs') {
    codeDiffs = msg.diffs || [];
    codeCollectionRenames = msg.collectionRenames || [];
    codeModeRenames = msg.modeRenames || [];
    codeTimestamp = msg.timestamp;
    codeSource = msg.source;
    codeSourceUrl = msg.sourceUrl;

    renderDiffs();

    // Auto-switch to code tab when code diffs arrive
    const totalChanges = codeDiffs.length + codeCollectionRenames.length + codeModeRenames.length;
    if (totalChanges > 0) {
      activeDiffTab = 'code';
      document.querySelectorAll('[data-diff-tab]').forEach(t => t.classList.remove('active'));
      document.querySelector('[data-diff-tab="code"]')?.classList.add('active');
      syncDiffView.classList.remove('active');
      codeDiffView.classList.add('active');
    }
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

    // Enable apply button after successful import
    applyButton.disabled = false;
  }

  if (msg && msg.type === 'import-error') {
    importButton.disabled = false;
    importButton.innerHTML = '<span>📥</span><span>Import Baseline</span>';
    alert('Import failed: ' + msg.error);
  }

  if (msg && msg.type === 'apply-success') {
    applyButton.disabled = false;
    applyButton.innerHTML = '<span>✨</span><span>Apply to Figma</span>';

    // Show success feedback briefly
    applyButton.innerHTML = '<span>✅</span><span>Applied!</span>';
    applyButton.style.background = '#10b981';
    applyButton.style.color = 'white';
    applyButton.style.borderColor = '#10b981';
    setTimeout(() => {
      applyButton.innerHTML = '<span>✨</span><span>Apply to Figma</span>';
      applyButton.style.background = '';
      applyButton.style.color = '';
      applyButton.style.borderColor = '';
    }, 2000);
  }

  if (msg && msg.type === 'apply-error') {
    applyButton.disabled = false;
    applyButton.innerHTML = '<span>✨</span><span>Apply to Figma</span>';
    alert('Apply failed: ' + msg.error);
  }

  // Remote sync message handlers
  if (msg && msg.type === 'fetch-started') {
    remoteStatus.state = 'fetching';
    updateRemoteStatus();
  }

  if (msg && msg.type === 'fetch-success') {
    remoteStatus.state = 'idle';
    remoteStatus.lastFetched = Date.now();
    remoteStatus.error = undefined;
    updateRemoteStatus();

    // Show success feedback
    const originalHtml = fetchBtn.innerHTML;
    fetchBtn.innerHTML = '✓ Fetched';
    fetchBtn.style.background = '#10b981';
    fetchBtn.style.color = 'white';
    setTimeout(() => {
      fetchBtn.innerHTML = originalHtml;
      fetchBtn.style.background = '';
      fetchBtn.style.color = '';
    }, 2000);
  }

  if (msg && msg.type === 'fetch-error') {
    remoteStatus.state = 'error';
    remoteStatus.error = msg.error;
    updateRemoteStatus();
  }

  if (msg && msg.type === 'update-check-result') {
    remoteStatus.state = 'idle';
    remoteStatus.updatesAvailable = msg.updatesAvailable || 0;
    updateRemoteStatus();
  }

  if (msg && msg.type === 'settings-update') {
    populateSettingsForm(msg.settings);
    updateRemoteStatus();
  }

  if (msg && msg.type === 'settings-saved') {
    if (msg.settings) {
      remoteSettings = msg.settings;
    }
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.textContent = 'Save Settings';

    // Show success feedback
    const originalText = saveSettingsBtn.textContent;
    saveSettingsBtn.textContent = 'Saved!';
    saveSettingsBtn.style.background = '#10b981';
    setTimeout(() => {
      saveSettingsBtn.textContent = originalText;
      saveSettingsBtn.style.background = '';
    }, 1500);

    // Update status display with new settings
    updateRemoteStatus();

    // Close settings panel
    setTimeout(() => {
      hideSettingsPanel();
    }, 1000);
  }

  if (msg && msg.type === 'connection-test-result') {
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Test Connection';

    if (msg.success) {
      testConnectionBtn.textContent = '✓ Connection OK';
      testConnectionBtn.style.background = '#10b981';
      testConnectionBtn.style.color = 'white';
      setTimeout(() => {
        testConnectionBtn.textContent = 'Test Connection';
        testConnectionBtn.style.background = '';
        testConnectionBtn.style.color = '';
      }, 2000);
    } else {
      alert('Connection failed: ' + msg.error);
    }
  }
};

// Tell plugin we're ready and request settings
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
parent.postMessage({ pluginMessage: { type: 'get-settings' } }, '*');
updateRemoteStatus();
