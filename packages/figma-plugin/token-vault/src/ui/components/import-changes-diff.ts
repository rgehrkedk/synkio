/**
 * Import Changes Diff Component
 *
 * Displays detected changes between imported baseline and current Figma state,
 * allowing users to preview what will change before applying the import.
 */

import type { VersionBump, TokenChange } from '../../backend/utils/version-manager.js';
import { sendToBackend } from '../utils/message-bridge.js';

// Store the baseline for confirmation
let pendingBaseline: unknown = null;

/**
 * Render import changes diff UI
 * @param versionBump - Version bump data with changes
 * @param baseline - The baseline data to import on confirmation
 */
export function renderImportChangesDiff(versionBump: VersionBump, baseline: unknown): void {
  pendingBaseline = baseline;
  
  const container = document.getElementById('importChangesSection');
  if (!container) {
    // Create the container if it doesn't exist
    const mainContent = document.querySelector('.content') || document.body;
    const section = document.createElement('div');
    section.id = 'importChangesSection';
    section.className = 'import-changes-section';
    mainContent.insertBefore(section, mainContent.firstChild);
    renderImportChangesDiff(versionBump, baseline);
    return;
  }

  container.style.display = 'block';
  
  const hasChanges = versionBump.changes.length > 0;
  const actionText = hasChanges ? 'Apply Import' : 'Import Anyway';
  
  container.innerHTML = `
    <div class="sync-changes import-changes">
      <div class="changes-header">
        <span class="icon">📥</span>
        <div class="title">Import Preview</div>
        <div class="subtitle">Comparing imported baseline with current Figma variables</div>
      </div>

      <div class="changes-content">
        <div class="version-comparison">
          <span class="label">Current Figma:</span>
          <span class="version-badge current">v${versionBump.current}</span>
          <span class="arrow">→</span>
          <span class="label">Importing:</span>
          <span class="version-badge importing">v${versionBump.suggested}</span>
        </div>

        ${hasChanges ? `
          ${renderChangeSection('breaking', versionBump.changes, '🔴 Breaking Changes', 'Will be removed/changed')}
          ${renderChangeSection('addition', versionBump.changes, '🟢 New Additions', 'Will be added')}
          ${renderChangeSection('patch', versionBump.changes, '🟡 Value Updates', 'Will be updated')}
        ` : `
          <div class="no-changes">
            <span class="icon">✓</span>
            <span>No differences detected. The imported baseline matches your current Figma variables.</span>
          </div>
        `}

        <div class="import-summary">
          <div class="summary-item">
            <span class="count">${versionBump.breakingCount}</span>
            <span class="label">Breaking</span>
          </div>
          <div class="summary-item">
            <span class="count">${versionBump.additionCount}</span>
            <span class="label">Additions</span>
          </div>
          <div class="summary-item">
            <span class="count">${versionBump.patchCount}</span>
            <span class="label">Updates</span>
          </div>
        </div>
      </div>

      <div class="sync-actions import-actions">
        <button id="cancelImportBtn" class="button button-secondary">Cancel</button>
        <button id="confirmImportBtn" class="button button-primary">${actionText}</button>
      </div>
    </div>
  `;

  attachImportEventListeners();
}

/**
 * Render a change section for a specific change type
 */
function renderChangeSection(
  type: 'breaking' | 'addition' | 'patch',
  allChanges: TokenChange[],
  title: string,
  description: string
): string {
  const changes = allChanges.filter(c => c.type === type);

  if (changes.length === 0) return '';

  return `
    <div class="change-section ${type}">
      <div class="section-header">
        ${title} (${changes.length})
        <span class="section-desc">${description}</span>
      </div>
      <div class="section-items">
        ${changes.slice(0, 8).map(change => `
          <div class="change-item">
            <span class="change-path">${escapeHtml(change.path)}</span>
            ${renderChangeValue(change)}
          </div>
        `).join('')}
        ${changes.length > 8 ? `
          <div class="more-changes">
            ... and ${changes.length - 8} more ${type} changes
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render the before/after values for a change
 */
function renderChangeValue(change: TokenChange): string {
  if (change.before !== undefined && change.after !== undefined) {
    return `
      <div class="change-values">
        <span class="before">${escapeHtml(formatValue(change.before))}</span>
        <span class="arrow">→</span>
        <span class="after">${escapeHtml(formatValue(change.after))}</span>
      </div>
    `;
  } else if (change.after !== undefined) {
    return `<div class="change-values"><span class="after new">${escapeHtml(formatValue(change.after))}</span></div>`;
  } else if (change.before !== undefined) {
    return `<div class="change-values"><span class="before removed">${escapeHtml(formatValue(change.before))}</span></div>`;
  }
  return '';
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Attach event listeners to import diff UI
 */
function attachImportEventListeners(): void {
  const confirmBtn = document.getElementById('confirmImportBtn');
  const cancelBtn = document.getElementById('cancelImportBtn');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingBaseline) {
        sendToBackend({
          type: 'confirm-baseline-import',
          baseline: pendingBaseline
        } as any);
        hideImportChangesDiff();
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideImportChangesDiff();
    });
  }
}

/**
 * Hide import changes diff UI
 */
export function hideImportChangesDiff(): void {
  pendingBaseline = null;
  const container = document.getElementById('importChangesSection');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
