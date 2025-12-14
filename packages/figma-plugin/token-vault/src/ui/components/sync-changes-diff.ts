/**
 * Sync Changes Diff Component
 *
 * Displays detected changes between current Figma tokens and previous baseline,
 * showing version bump suggestions and allowing manual version override.
 */

import type { VersionBump, TokenChange } from '../../backend/utils/version-manager.js';
import { sendMessage } from '../message-bridge.js';

/**
 * Render sync changes diff UI
 * @param versionBump - Version bump data with changes and suggested version
 */
export function renderSyncChangesDiff(versionBump: VersionBump): void {
  const container = document.getElementById('syncChangesSection');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = `
    <div class="sync-changes">
      <div class="changes-header">
        <span class="icon">📊</span>
        <div class="title">Changes Detected</div>
      </div>

      <div class="changes-content">
        ${renderChangeSection('breaking', versionBump.changes, '🔴 Breaking Changes', 'MAJOR')}
        ${renderChangeSection('addition', versionBump.changes, '🟡 New Additions', 'MINOR')}
        ${renderChangeSection('patch', versionBump.changes, '🟢 Value Updates', 'PATCH')}

        <div class="version-bump-box">
          <div class="bump-title">Version Bump</div>
          <div class="bump-display">
            <span class="version-current">${versionBump.current}</span>
            →
            <span class="version-new">${versionBump.suggested} (${versionBump.changeType.toUpperCase()})</span>
          </div>

          <div class="version-override">
            <label>Override:</label>
            <div class="version-inputs">
              <input type="number" id="versionMajor" value="${versionBump.suggested.split('.')[0]}" min="0" />
              .
              <input type="number" id="versionMinor" value="${versionBump.suggested.split('.')[1]}" min="0" />
              .
              <input type="number" id="versionPatch" value="${versionBump.suggested.split('.')[2]}" min="0" />
            </div>
          </div>
        </div>
      </div>

      <div class="sync-actions">
        <button id="cancelSyncBtn" class="button button-secondary">Cancel</button>
        <button id="syncNowBtn" class="button button-primary">Sync Now (v${versionBump.suggested})</button>
      </div>
    </div>
  `;

  attachSyncEventListeners(versionBump);
}

/**
 * Render a change section for a specific change type
 * @param type - Change type to filter by
 * @param allChanges - All detected changes
 * @param title - Section title with emoji
 * @param badge - Badge text (MAJOR, MINOR, PATCH)
 * @returns HTML string for the section
 */
function renderChangeSection(
  type: 'breaking' | 'addition' | 'patch',
  allChanges: TokenChange[],
  title: string,
  badge: string
): string {
  const changes = allChanges.filter(c => c.type === type);

  if (changes.length === 0) return '';

  return `
    <div class="change-section ${type}">
      <div class="section-header">
        ${title} (${changes.length}) → ${badge}
      </div>
      <div class="section-items">
        ${changes.slice(0, 5).map(change => `
          <div class="change-item">
            • ${escapeHtml(change.description)}
          </div>
        `).join('')}
        ${changes.length > 5 ? `
          <div class="more-changes">
            ... and ${changes.length - 5} more
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to sync diff UI elements
 * @param versionBump - Version bump data for sync operation
 */
function attachSyncEventListeners(versionBump: VersionBump): void {
  const syncBtn = document.getElementById('syncNowBtn');
  const cancelBtn = document.getElementById('cancelSyncBtn');

  // Version override inputs
  const majorInput = document.getElementById('versionMajor') as HTMLInputElement;
  const minorInput = document.getElementById('versionMinor') as HTMLInputElement;
  const patchInput = document.getElementById('versionPatch') as HTMLInputElement;

  const updateSyncButton = () => {
    const version = `${majorInput.value}.${minorInput.value}.${patchInput.value}`;
    if (syncBtn) {
      syncBtn.textContent = `Sync Now (v${version})`;
    }
  };

  [majorInput, minorInput, patchInput].forEach(input => {
    if (input) {
      input.addEventListener('input', updateSyncButton);
    }
  });

  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const newVersion = `${majorInput.value}.${minorInput.value}.${patchInput.value}`;
      await handleSyncNow(newVersion, versionBump);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideSyncChangesDiff();
    });
  }
}

/**
 * Handle sync now action - triggers backend sync with new version
 * @param newVersion - Version to use for the sync
 * @param versionBump - Original version bump data
 */
async function handleSyncNow(newVersion: string, versionBump: VersionBump): Promise<void> {
  try {
    // Send sync message with version override
    sendMessage({
      type: 'sync-with-version',
      version: newVersion,
      changes: versionBump.changes
    } as any); // TODO: Update UIMessage type

    // UI will be updated when sync-complete message is received
    hideSyncChangesDiff();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

/**
 * Hide sync changes diff UI
 */
export function hideSyncChangesDiff(): void {
  const container = document.getElementById('syncChangesSection');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns Escaped text safe for HTML insertion
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
