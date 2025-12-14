/**
 * Baseline Confirmation UI Component
 *
 * Shows confirmation UI when a baseline file is detected with 3 states:
 * - Valid baseline: Ready to import
 * - Broken references: Blocks import with error details
 * - Version warning: Allows import with compatibility warning
 */

import { getState, setState } from '../state.js';
import type { BaselineDetectionResult } from '../../backend/utils/baseline-detector.js';
import type { ValidationResult } from '../../backend/utils/baseline-validator.js';
import type { UploadedFile } from '../state.js';
import { isVersionCompatible } from '../../backend/utils/baseline-detector.js';
import { sendToBackend } from '../utils/message-bridge.js';

export interface BaselineConfirmationOptions {
  detection: BaselineDetectionResult;
  validation: ValidationResult;
  onImport?: () => void;
  onConfigureManually?: () => void;
}

/**
 * Render baseline confirmation UI
 *
 * Displays appropriate UI based on validation status and version compatibility
 */
export function renderBaselineConfirmation(options: BaselineConfirmationOptions): void {
  const container = document.getElementById('baselineConfirmationSection');
  if (!container) return;

  container.style.display = 'block';

  if (!options.validation.valid) {
    container.innerHTML = renderBrokenReferencesUI(options);
  } else if (hasVersionWarning(options.detection)) {
    container.innerHTML = renderVersionWarningUI(options);
  } else {
    container.innerHTML = renderValidBaselineUI(options);
  }

  // Attach event listeners
  attachBaselineEventListeners(options);
}

/**
 * Render valid baseline UI
 *
 * Shows collection summary with metadata and import confirmation
 */
function renderValidBaselineUI(options: BaselineConfirmationOptions): string {
  const { detection } = options;
  const exportedDate = formatDate(detection.metadata!.exportedAt);

  return `
    <div class="baseline-confirmation valid">
      <div class="baseline-header">
        <span class="status-icon">✅</span>
        <div class="baseline-title">
          <div class="filename">Baseline export file detected</div>
          <div class="file-info">Exported: ${exportedDate} • Version: v${detection.metadata!.version}</div>
        </div>
      </div>

      <div class="baseline-content">
        <div class="collections-summary">
          <div class="summary-title">📊 Contains:</div>
          ${detection.collections!.map(c => `
            <div class="collection-item">
              • ${c.name} (${c.modeCount} mode${c.modeCount > 1 ? 's' : ''}, ${c.tokenCount} tokens)
            </div>
          `).join('')}
        </div>

        <div class="validation-status">
          <div class="status-item valid">✓ No broken references</div>
          <div class="status-item valid">✓ All aliases valid</div>
        </div>

        <div class="confirmation-question">
          Import as originally exported?
        </div>
      </div>

      <div class="baseline-actions">
        <button id="importBaselineBtn" class="button button-primary">
          ✓ Yes, Import as-is
        </button>
        <button id="configureManuallyBtn" class="button button-secondary">
          Configure Manually
        </button>
      </div>
    </div>
  `;
}

/**
 * Render broken references UI (blocks import)
 *
 * Shows detailed error information for broken alias references
 */
function renderBrokenReferencesUI(options: BaselineConfirmationOptions): string {
  const { validation } = options;

  return `
    <div class="baseline-confirmation blocked">
      <div class="baseline-header error">
        <span class="status-icon">⛔</span>
        <div class="baseline-title">
          <div class="filename">Cannot Import - Broken References</div>
          <div class="file-info">Version: v${options.detection.metadata?.version || 'unknown'}</div>
        </div>
      </div>

      <div class="baseline-content">
        <div class="error-summary">
          ❌ Found ${validation.brokenAliases.length} broken alias reference${validation.brokenAliases.length > 1 ? 's' : ''}:
        </div>

        <div class="broken-aliases-list">
          ${validation.brokenAliases.slice(0, 5).map(alias => `
            <div class="broken-alias-item">
              <div class="alias-path">• ${alias.tokenPath}</div>
              <div class="alias-error">→ References: ${alias.aliasReference}</div>
              <div class="alias-error">→ Error: ${alias.error}</div>
            </div>
          `).join('')}
          ${validation.brokenAliases.length > 5 ? `
            <div class="more-errors">
              ... and ${validation.brokenAliases.length - 5} more
            </div>
          ` : ''}
        </div>

        <div class="fix-instructions">
          ⚠️ Fix required:
          <ol>
            <li>Restore deleted tokens, OR</li>
            <li>Update aliases to valid references, OR</li>
            <li>Convert aliases to hardcoded values</li>
          </ol>
        </div>
      </div>

      <div class="baseline-actions">
        <button id="closeBaselineBtn" class="button button-secondary">
          Close
        </button>
      </div>
    </div>
  `;
}

/**
 * Render version warning UI
 *
 * Shows compatibility warning but allows import
 */
function renderVersionWarningUI(options: BaselineConfirmationOptions): string {
  const { detection } = options;
  const pluginVersion = '2.0.0'; // Current plugin version
  const compatibility = isVersionCompatible(detection.metadata!.version);

  return `
    <div class="baseline-confirmation warning">
      <div class="baseline-header warning">
        <span class="status-icon">⚠️</span>
        <div class="baseline-title">
          <div class="filename">Version Mismatch Warning</div>
          <div class="file-info">
            Baseline: v${detection.metadata!.version} • Plugin: v${pluginVersion}
          </div>
        </div>
      </div>

      <div class="baseline-content">
        <div class="warning-message">
          ${compatibility.warning || '⚠️ This baseline was exported from a different plugin version. Some features may not be supported.'}
        </div>

        <div class="collections-summary">
          <div class="summary-title">📊 Contains:</div>
          ${detection.collections!.map(c => `
            <div class="collection-item">
              • ${c.name} (${c.modeCount} mode${c.modeCount > 1 ? 's' : ''}, ${c.tokenCount} tokens)
            </div>
          `).join('')}
        </div>

        <div class="confirmation-question">
          Continue with import?
        </div>
      </div>

      <div class="baseline-actions">
        <button id="cancelBaselineBtn" class="button button-secondary">
          Cancel
        </button>
        <button id="importAnywayBtn" class="button button-primary">
          Import Anyway
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to baseline confirmation buttons
 */
function attachBaselineEventListeners(options: BaselineConfirmationOptions): void {
  const importBtn = document.getElementById('importBaselineBtn');
  const importAnywayBtn = document.getElementById('importAnywayBtn');
  const configureBtn = document.getElementById('configureManuallyBtn');
  const cancelBtn = document.getElementById('cancelBaselineBtn');
  const closeBtn = document.getElementById('closeBaselineBtn');

  if (importBtn || importAnywayBtn) {
    (importBtn || importAnywayBtn)!.addEventListener('click', async () => {
      await handleImportBaseline(options);
    });
  }

  if (configureBtn || cancelBtn || closeBtn) {
    (configureBtn || cancelBtn || closeBtn)!.addEventListener('click', () => {
      hideBaselineConfirmation();
      options.onConfigureManually?.();
    });
  }
}

/**
 * Handle import baseline action
 *
 * Sends the baseline file to the backend for import
 */
async function handleImportBaseline(options: BaselineConfirmationOptions): Promise<void> {
  const state = getState();

  // Find the baseline file in uploaded files
  let baselineFile: UploadedFile | undefined;

  for (const [name, file] of state.files.entries()) {
    baselineFile = file;
    break; // For now, assume first file is the baseline
  }

  if (!baselineFile) {
    showNotification('❌ File not found', 'error');
    return;
  }

  try {
    showNotification('Analyzing changes...');

    // Send message to backend to preview import (shows diff before applying)
    sendToBackend({
      type: 'preview-baseline-import',
      baseline: baselineFile.content
    });

    // The result will come back via 'import-changes-detected' message
    // Hide the confirmation UI - the import diff modal will show
    hideBaselineConfirmation();
    options.onImport?.();
  } catch (error) {
    showNotification(`❌ Import error: ${(error as Error).message}`, 'error');
  }
}

/**
 * Hide baseline confirmation UI
 */
export function hideBaselineConfirmation(): void {
  const container = document.getElementById('baselineConfirmationSection');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Format date string for display
 *
 * Converts ISO string to human-readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if version warning should be shown
 *
 * Compares baseline version with current plugin version
 */
function hasVersionWarning(detection: BaselineDetectionResult): boolean {
  if (!detection.metadata) return false;

  const compatibility = isVersionCompatible(detection.metadata.version);
  return compatibility.compatible && !!compatibility.warning;
}

/**
 * Show notification to user
 *
 * Simple UI notification (in production, this could be enhanced with a toast component)
 */
function showNotification(message: string, type: 'error' | 'success' | 'info' = 'info'): void {
  if (type === 'error') {
    alert(message);
  } else {
    console.log(`[${type}] ${message}`);
  }
}
