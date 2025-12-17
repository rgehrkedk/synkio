/**
 * Mode toggle component - renders mode switcher for filtering tokens
 * Used on collection pages (single toggle) and overview page (per-collection toggles)
 */
import { escapeHtml, capitalizeFirst } from './utils.js';

interface ModeToggleProps {
  modes: string[];
  defaultMode: string;
  /** Optional: collection name for collection-specific mode filtering */
  collection?: string;
  /** Optional: label to show before the toggle */
  label?: string;
}

interface CollectionModeTogglesProps {
  /** Map of collection name to its available modes */
  collectionModes: Map<string, string[]>;
  defaultMode: string;
}

/**
 * Render a single mode toggle (for collection pages)
 */
export function renderModeToggle({ modes, defaultMode, collection, label }: ModeToggleProps): string {
  if (modes.length <= 1) {
    return ''; // Don't show toggle if only one mode
  }

  const dataCollection = collection ? ` data-collection="${escapeHtml(collection)}"` : '';

  return `
    <div class="docs-mode-row">
      ${label ? `<span class="docs-mode-label">${escapeHtml(label)}</span>` : ''}
      <div class="docs-mode-switcher"${dataCollection}>
        ${modes.map((mode, i) => `
          <button class="docs-mode-btn ${mode === defaultMode ? 'active' : ''}" data-mode="${escapeHtml(mode)}">
            ${capitalizeFirst(mode)}
          </button>
        `).join('')}
      </div>
    </div>`;
}

/**
 * Render per-collection mode toggles (for overview page)
 * Each collection gets its own toggle if it has multiple modes
 */
export function renderCollectionModeToggles({ collectionModes, defaultMode }: CollectionModeTogglesProps): string {
  const toggles: string[] = [];

  for (const [collection, modes] of collectionModes) {
    if (modes.length > 1) {
      toggles.push(`
        <div class="docs-collection-mode-toggle">
          <span class="docs-mode-label">${escapeHtml(capitalizeFirst(collection))}</span>
          <div class="docs-mode-switcher" data-collection="${escapeHtml(collection)}">
            ${modes.map(mode => `
              <button class="docs-mode-btn ${mode === defaultMode ? 'active' : ''}" data-mode="${escapeHtml(mode)}">
                ${capitalizeFirst(mode)}
              </button>
            `).join('')}
          </div>
        </div>
      `);
    }
  }

  if (toggles.length === 0) {
    return ''; // No collections have multiple modes
  }

  return `
    <div class="docs-mode-row docs-mode-row--overview">
      ${toggles.join('')}
    </div>`;
}
