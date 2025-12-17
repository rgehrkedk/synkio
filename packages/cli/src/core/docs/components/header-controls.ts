/**
 * Header controls component (search, platform switcher, theme toggle)
 * Mode toggle is handled separately at the page level
 */
import { escapeHtml, getPlatformLabel } from './utils.js';

interface HeaderControlsProps {
  platforms: string[];
  defaultPlatform: string | null;
}

/**
 * Generate the header controls HTML
 * Layout: Search | Platform Switcher (if multiple platforms) | Theme Toggle
 */
export function renderHeaderControls({ platforms, defaultPlatform }: HeaderControlsProps): string {
  const hasMultiplePlatforms = platforms.length > 1;

  return `
        <div class="docs-controls">
          <input type="text" class="docs-search" placeholder="Search tokens..." id="searchInput">

          ${hasMultiplePlatforms ? `
          <div class="docs-platform-switcher">
            <label for="platformSelect" style="font-size: 12px; color: var(--docs-text-muted); margin-right: 8px;">Platform:</label>
            <select id="platformSelect" class="docs-platform-select">
              ${platforms.map(platform => `
                <option value="${escapeHtml(platform)}" ${platform === defaultPlatform ? 'selected' : ''}>
                  ${escapeHtml(getPlatformLabel(platform))}
                </option>
              `).join('')}
            </select>
          </div>
          ` : ''}

          <button class="docs-theme-toggle" id="themeToggle" title="Toggle theme">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>`;
}
