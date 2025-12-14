/**
 * Level Selector Component
 * Allows users to configure how JSON levels map to Figma structure
 * (Collection, Mode, or Token Path)
 */

import type { LevelConfiguration, LevelRole } from '../../types/level-config.types.js';
import { updateLevelConfiguration } from '../state.js';
import { validateLevelRoles } from '../utils/level-validation.js';

/**
 * Analyzed level information from JSON structure
 */
export interface AnalyzedLevel {
  depth: number;
  exampleKeys: string[];
  keyCount: number;
}

/**
 * Options for renderLevelSelector
 */
export interface LevelSelectorOptions {
  containerId?: string;
  compact?: boolean;
  onConfigChange?: (config: LevelConfiguration[]) => void;
}

/**
 * Render level selector component
 * Shows radio buttons for each level with Collection/Mode/Token Path options
 * @param levels - Array of analyzed levels from JSON structure
 * @param options - Optional configuration options
 */
export function renderLevelSelector(
  levels: AnalyzedLevel[],
  options: LevelSelectorOptions | string = {}
): void {
  // Support legacy call signature: renderLevelSelector(levels, containerId, compact)
  let containerId = 'levelSelectorContainer';
  let compact = false;
  let onConfigChange: ((config: LevelConfiguration[]) => void) | undefined;

  if (typeof options === 'string') {
    // Legacy call: renderLevelSelector(levels, containerId)
    containerId = options;
    // Check if third argument was passed (compact boolean)
    // This handles calls like renderLevelSelector(levels, 'container-id', true)
  } else {
    containerId = options.containerId || 'levelSelectorContainer';
    compact = options.compact || false;
    onConfigChange = options.onConfigChange;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[LevelSelector] Container element not found: #${containerId}`);
    return;
  }

  // Create unique IDs for this instance using the container ID
  // Handle both 'levelSelectorContainer' (default) and 'level-selector-{groupId}' (multi-collection)
  const isDefault = containerId === 'levelSelectorContainer';
  const uniqueSuffix = isDefault ? '' : containerId.replace(/^level-selector-/, '');
  const levelsId = uniqueSuffix ? `levelSelectorLevels-${uniqueSuffix}` : 'levelSelectorLevels';
  const validationId = uniqueSuffix ? `levelValidation-${uniqueSuffix}` : 'levelValidation';

  // Initialize configuration with all levels as 'token-path'
  const initialConfig: LevelConfiguration[] = levels.map((level) => ({
    depth: level.depth,
    role: 'token-path' as LevelRole,
    exampleKeys: level.exampleKeys,
    keyCount: level.keyCount,
  }));

  // Header section (hidden in compact mode)
  const headerHtml = compact ? '' : `
      <div class="level-selector-header">
        <h3 class="section-title">Configure Import Structure</h3>
        <p class="section-description">
          Define how the JSON levels map to Figma collections and modes:
        </p>
      </div>`;

  // Render the selector UI
  container.innerHTML = `
    <div class="level-selector${compact ? ' level-selector-compact' : ''}">
      ${headerHtml}
      <div class="level-selector-levels" id="${levelsId}">
        ${levels.map((level, index) => renderLevelOption(level, index, initialConfig)).join('')}
      </div>

      <div class="level-selector-validation" id="${validationId}">
        ${renderValidation(initialConfig)}
      </div>
    </div>
  `;

  // Attach event listeners
  attachEventListeners(container, levels, initialConfig, validationId, onConfigChange);

  // Emit initial configuration (global state update for single-file mode)
  if (!onConfigChange) {
    updateLevelConfiguration(initialConfig);
  } else {
    onConfigChange(initialConfig);
  }
  emitConfigurationChanged(initialConfig);
}

/**
 * Render a single level selector option
 */
function renderLevelOption(
  level: AnalyzedLevel,
  index: number,
  currentConfig: LevelConfiguration[]
): string {
  const currentRole = currentConfig[index]?.role || 'token-path';
  const isLastLevel = index === currentConfig.length - 1;

  // Format example keys for display (max 5)
  const displayKeys = level.exampleKeys.slice(0, 5).join(', ');
  const moreCount = level.keyCount > 5 ? level.keyCount - 5 : 0;
  const keysDisplay = moreCount > 0 ? `${displayKeys}... (+${moreCount} more)` : displayKeys;

  return `
    <div class="level-option" data-depth="${level.depth}">
      <div class="level-option-header">
        <span class="level-label">Level ${level.depth}:</span>
        <span class="level-key-count">${level.keyCount} keys</span>
      </div>

      <div class="level-option-keys">
        ${escapeHtml(keysDisplay)}
      </div>

      <div class="level-option-radios">
        <label class="radio-label ${isLastLevel ? 'disabled' : ''}">
          <input
            type="radio"
            name="level-${level.depth}"
            value="collection"
            ${currentRole === 'collection' ? 'checked' : ''}
            ${isLastLevel ? 'disabled' : ''}
            data-depth="${level.depth}"
          />
          <span>Collection</span>
        </label>

        <label class="radio-label ${isLastLevel ? 'disabled' : ''}">
          <input
            type="radio"
            name="level-${level.depth}"
            value="mode"
            ${currentRole === 'mode' ? 'checked' : ''}
            ${isLastLevel ? 'disabled' : ''}
            data-depth="${level.depth}"
          />
          <span>Mode</span>
        </label>

        <label class="radio-label">
          <input
            type="radio"
            name="level-${level.depth}"
            value="token-path"
            ${currentRole === 'token-path' ? 'checked' : ''}
            data-depth="${level.depth}"
          />
          <span>Token Path</span>
        </label>
      </div>
    </div>
  `;
}

/**
 * Render validation messages
 */
function renderValidation(config: LevelConfiguration[]): string {
  const validation = validateLevelRoles(config);

  if (!validation.valid) {
    return `
      <div class="validation-error">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.1"/>
          <path d="M8 4v5M8 11h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>${escapeHtml(validation.errors[0])}</span>
      </div>
    `;
  }

  if (validation.warnings.length > 0) {
    return `
      <div class="validation-warning">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1l7 12H1L8 1z" fill="currentColor" opacity="0.1"/>
          <path d="M8 6v4M8 11h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>${escapeHtml(validation.warnings[0])}</span>
      </div>
    `;
  }

  return '';
}

/**
 * Attach event listeners for radio button changes
 */
function attachEventListeners(
  container: HTMLElement,
  levels: AnalyzedLevel[],
  initialConfig: LevelConfiguration[],
  validationId: string = 'levelValidation',
  onConfigChange?: (config: LevelConfiguration[]) => void
): void {
  let currentConfig = [...initialConfig];

  // Listen for radio button changes
  container.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;

    if (target.type === 'radio' && target.dataset.depth) {
      const depth = parseInt(target.dataset.depth, 10);
      const newRole = target.value as LevelRole;

      // Update configuration
      const configIndex = currentConfig.findIndex((c) => c.depth === depth);
      if (configIndex !== -1) {
        currentConfig[configIndex] = {
          ...currentConfig[configIndex],
          role: newRole,
        };

        // Update state (either via callback or global state)
        if (onConfigChange) {
          onConfigChange(currentConfig);
        } else {
          updateLevelConfiguration(currentConfig);
        }

        // Re-render validation
        const validationEl = document.getElementById(validationId);
        if (validationEl) {
          validationEl.innerHTML = renderValidation(currentConfig);
        }

        // Emit event for preview updates
        emitConfigurationChanged(currentConfig);
      }
    }
  });
}

/**
 * Emit custom event when configuration changes
 * This allows the live preview component to update
 */
function emitConfigurationChanged(config: LevelConfiguration[]): void {
  const event = new CustomEvent('level-configuration-changed', {
    detail: {
      configuration: config,
      validation: validateLevelRoles(config),
    },
  });
  document.dispatchEvent(event);
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get current configuration (for external use)
 */
export function getCurrentConfiguration(container: HTMLElement): LevelConfiguration[] | null {
  const levelOptions = container.querySelectorAll('.level-option');
  if (levelOptions.length === 0) return null;

  const config: LevelConfiguration[] = [];

  levelOptions.forEach((option) => {
    const depth = parseInt(option.getAttribute('data-depth') || '0', 10);
    const selectedRadio = option.querySelector('input[type="radio"]:checked') as HTMLInputElement;

    if (selectedRadio) {
      config.push({
        depth,
        role: selectedRadio.value as LevelRole,
      });
    }
  });

  return config;
}
