/**
 * Token card components for displaying design tokens
 */
import type { ParsedToken } from '../index.js';
import {
  escapeHtml,
  formatDisplayValue,
  formatReferencePath,
  getColorBackground,
  getPlatformLabel
} from './utils.js';

/**
 * Generate HTML for platform-specific variable names with smart default
 */
export function renderPlatformVariables(token: ParsedToken, defaultPlatform?: string): string {
  if (!token.platformVariables || Object.keys(token.platformVariables).length === 0) {
    // No platform variables - show CSS variable only
    return `<div class="docs-token-variable" data-copy="${escapeHtml(token.cssVariable)}">${escapeHtml(token.cssVariable)}</div>`;
  }

  const platforms = Object.keys(token.platformVariables);

  // If only one platform, show it directly
  if (platforms.length === 1) {
    const platform = platforms[0];
    const varName = token.platformVariables[platform];
    return `<div class="docs-token-variable" data-copy="${escapeHtml(varName)}">${escapeHtml(varName)}</div>`;
  }

  // Multiple platforms - show only the default, hide others
  const activePlatform = defaultPlatform || platforms[0];

  return Object.entries(token.platformVariables)
    .map(([platform, varName]) => {
      const isActive = platform === activePlatform;
      return `<div class="docs-token-variable docs-token-variable--platform" data-platform="${escapeHtml(platform)}" data-copy="${escapeHtml(varName)}" style="${isActive ? '' : 'display: none;'}">${escapeHtml(varName)}</div>`;
    })
    .join('');
}

/**
 * Generate code block with platform variables for table cells
 */
export function renderPlatformVariablesCode(token: ParsedToken, defaultPlatform?: string): string {
  if (!token.platformVariables || Object.keys(token.platformVariables).length === 0) {
    // No platform variables - show CSS variable only
    return `<code data-copy="${escapeHtml(token.cssVariable)}">${escapeHtml(token.cssVariable)}</code>`;
  }

  const platforms = Object.keys(token.platformVariables);

  // If only one platform, show it directly
  if (platforms.length === 1) {
    const platform = platforms[0];
    const varName = token.platformVariables[platform];
    return `<code data-copy="${escapeHtml(varName)}">${escapeHtml(varName)}</code>`;
  }

  // Multiple platforms - show only the default, hide others
  const activePlatform = defaultPlatform || platforms[0];

  return Object.entries(token.platformVariables)
    .map(([platform, varName]) => {
      const isActive = platform === activePlatform;
      return `<code class="docs-token-variable--platform" data-platform="${escapeHtml(platform)}" data-copy="${escapeHtml(varName)}" style="${isActive ? '' : 'display: none;'}">${escapeHtml(varName)}</code>`;
    })
    .join('');
}

/**
 * Get typography CSS style for preview
 */
function getTypographyStyle(token: ParsedToken): string {
  const type = token.type.toLowerCase();
  const value = token.value;

  switch (type) {
    case 'fontsize':
      const size = typeof value === 'number' ? `${value}px` : value;
      return `font-size: ${size}`;
    case 'fontfamily':
      return `font-family: ${value}`;
    case 'fontweight':
      return `font-weight: ${value}`;
    case 'lineheight':
      return `line-height: ${value}`;
    case 'letterspacing':
      const spacing = typeof value === 'number' ? `${value}px` : value;
      return `letter-spacing: ${spacing}`;
    default:
      return '';
  }
}

/**
 * Render reference indicator HTML
 */
function renderReferenceIndicator(token: ParsedToken): string {
  if (!token.referencePath) return '';
  return `<div class="docs-token-reference" data-copy="${escapeHtml(formatReferencePath(token.referencePath))}" title="References ${escapeHtml(token.referencePath)}">→ ${escapeHtml(formatReferencePath(token.referencePath))}</div>`;
}

/**
 * Render a color token card
 */
export function renderColorTokenCard(token: ParsedToken, defaultPlatform?: string): string {
  const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
  const referenceHtml = renderReferenceIndicator(token);

  return `
      <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
        <div class="docs-color-preview">
          <div class="docs-color-preview-inner" style="background: ${getColorBackground(displayValue)}"></div>
        </div>
        <div class="docs-token-info">
          <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
          ${referenceHtml}
          <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
            ${escapeHtml(formatDisplayValue(displayValue, token.type))}
          </div>
          ${renderPlatformVariables(token, defaultPlatform)}
        </div>
      </div>`;
}

/**
 * Render a typography token card
 */
export function renderTypographyTokenCard(token: ParsedToken, defaultPlatform?: string, previewText: string = 'Aa Bb Cc'): string {
  const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
  const referenceHtml = renderReferenceIndicator(token);

  return `
      <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
        <div class="docs-typography-preview" style="${getTypographyStyle(token)}">
          ${previewText}
        </div>
        <div class="docs-token-info">
          <div class="docs-token-name">${escapeHtml(token.path.split('.').pop() || token.path)}</div>
          ${referenceHtml}
          <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
            ${escapeHtml(formatDisplayValue(displayValue, token.type))}
          </div>
          ${renderPlatformVariables(token, defaultPlatform)}
        </div>
      </div>`;
}

/**
 * Render a generic token card
 */
export function renderGenericTokenCard(token: ParsedToken, defaultPlatform?: string): string {
  const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
  const referenceHtml = renderReferenceIndicator(token);

  return `
      <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
        <div class="docs-token-info" style="padding-top: var(--docs-space-lg);">
          <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
          ${referenceHtml}
          <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
            ${escapeHtml(formatDisplayValue(displayValue, token.type))}
          </div>
          ${renderPlatformVariables(token, defaultPlatform)}
        </div>
      </div>`;
}

/**
 * Token type detection helpers
 */
export function isColorToken(token: ParsedToken): boolean {
  return token.type.toLowerCase() === 'color';
}

export function isTypographyToken(token: ParsedToken): boolean {
  const type = token.type.toLowerCase();
  return ['fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing', 'typography'].includes(type);
}

export function isSpacingToken(token: ParsedToken): boolean {
  const type = token.type.toLowerCase();
  const path = token.path.toLowerCase();
  return type === 'dimension' || type === 'spacing' ||
    path.includes('spacing') || path.includes('space') || path.includes('gap');
}

/**
 * Render a token card with appropriate preview based on type
 */
export function renderTokenCard(token: ParsedToken, defaultPlatform?: string): string {
  if (isColorToken(token)) {
    return renderColorTokenCard(token, defaultPlatform);
  }
  if (isTypographyToken(token)) {
    return renderTypographyTokenCard(token, defaultPlatform);
  }
  return renderGenericTokenCard(token, defaultPlatform);
}
