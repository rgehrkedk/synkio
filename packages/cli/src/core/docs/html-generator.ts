import { ParsedToken } from './index.js';

interface NavItem {
  id: string;
  label: string;
  href: string;
  count: number;
}

interface TemplateOptions {
  title: string;
  modes: string[];
  defaultMode: string;
  syncedAt: string;
  navItems: NavItem[];
  metadata?: {
    syncedAt: string;
    source: {
      figmaFileId: string;
      figmaNodeId?: string;
    };
    output: {
      mode: string;
      dtcg: boolean;
      dir: string;
      css?: {
        enabled: boolean;
        file?: string;
        transforms?: {
          useRem?: boolean;
          basePxFontSize?: number;
        };
      };
      styleDictionary?: {
        buildPath?: string;
        platforms?: string[];
        outputReferences?: boolean;
      };
    };
    variableNaming: {
      prefix: string;
      separator: string;
      example: string;
    };
    collections: string[];
    modes: string[];
  };
}

/**
 * Generate the shared HTML layout wrapper
 */
function layout(content: string, options: TemplateOptions, activePage: string): string {
  const { title, modes, syncedAt, navItems } = options;
  const formattedDate = new Date(syncedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine available platforms and default platform
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : null;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark" data-mode="${options.defaultMode}"${defaultPlatform ? ` data-platform="${defaultPlatform}"` : ''}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Synkio Docs</title>
  <link rel="stylesheet" href="assets/tokens.css">
  <link rel="stylesheet" href="assets/utilities.css">
  <link rel="stylesheet" href="assets/docs.css">
</head>
<body>
  <div class="docs-layout">
    <!-- Sidebar -->
    <aside class="docs-sidebar">
      <a href="index.html" class="docs-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#6366f1"/>
          <path d="M8 16L14 22L24 10" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${title}
      </a>

      <nav class="docs-nav">
        <a href="index.html" class="${activePage === 'index' ? 'active' : ''}">
          Overview
        </a>

        <div class="docs-nav-section">Collections</div>
        ${navItems.map(item => `
        <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
          ${item.label}
          <span class="docs-nav-count">${item.count}</span>
        </a>
        `).join('')}

        <a href="all-tokens.html" class="${activePage === 'all' ? 'active' : ''}">
          All Tokens
        </a>

        <div class="docs-nav-section">Resources</div>
        <a href="tokens.json" target="_blank">
          tokens.json ↗
        </a>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="docs-main">
      <header class="docs-header">
        <div>
          <h1 class="docs-title">${getPageTitle(activePage)}</h1>
          <p class="docs-subtitle">Last synced: ${formattedDate}</p>
        </div>

        <div class="docs-controls">
          <input type="text" class="docs-search" placeholder="Search tokens..." id="searchInput">

          ${platforms.length > 1 ? `
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

          ${modes.length > 1 ? `
          <div class="docs-mode-switcher">
            ${modes.map((mode, i) => `
              <button class="docs-mode-btn ${i === 0 ? 'active' : ''}" data-mode="${mode}">
                ${capitalizeFirst(mode)}
              </button>
            `).join('')}
          </div>
          ` : ''}

          <button class="docs-theme-toggle" id="themeToggle" title="Toggle theme">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </header>

      ${content}

      <footer class="docs-footer">
        <span>Generated by <a href="https://github.com/rgehrkedk/synkio" target="_blank">Synkio</a></span>
        <span>Last updated: ${formattedDate}</span>
        ${options.metadata ? `
        <span>Output mode: ${options.metadata.output.mode === 'style-dictionary' ? 'Style Dictionary' : 'JSON'}</span>
        ${options.metadata.output.css?.enabled ? `<span>CSS transforms enabled</span>` : ''}
        ` : ''}
      </footer>
    </main>
  </div>

  <button class="docs-mobile-toggle" id="mobileToggle">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>

  <div class="docs-copied" id="copiedToast">Copied to clipboard!</div>

  <script src="assets/preview.js"></script>
</body>
</html>`;
}

function getPageTitle(page: string): string {
  switch (page) {
    case 'index': return 'Overview';
    case 'colors': return 'Colors';
    case 'typography': return 'Typography';
    case 'spacing': return 'Spacing';
    case 'all': return 'All Tokens';
    default: return 'Design Tokens';
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format display value - for resolved values (colors, numbers, etc.)
 */
function formatDisplayValue(value: any, type: string): string {
  if (value === null || value === undefined) return '–';
  
  if (typeof value === 'object') {
    if ('r' in value && 'g' in value && 'b' in value) {
      const r = Math.round(value.r * 255);
      const g = Math.round(value.g * 255);
      const b = Math.round(value.b * 255);
      const a = value.a ?? 1;
      if (a === 1) {
        // Convert to hex
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        return hex.toUpperCase();
      }
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }
    // Skip $ref objects - these should be handled by referencePath
    if ('$ref' in value) {
      return '→ reference';
    }
    return JSON.stringify(value);
  }
  
  if (typeof value === 'number') {
    switch (type.toLowerCase()) {
      case 'fontsize':
      case 'dimension':
      case 'spacing':
      case 'size':
        return `${value}px`;
      default:
        return String(value);
    }
  }
  
  return String(value);
}

/**
 * Format reference path for display - wrap in curly braces like DTCG format
 */
function formatReferencePath(path: string): string {
  return `{${path}}`;
}

/**
 * Get CSS background value for color preview
 */
function getColorBackground(value: any): string {
  if (typeof value === 'object' && 'r' in value) {
    const r = Math.round(value.r * 255);
    const g = Math.round(value.g * 255);
    const b = Math.round(value.b * 255);
    const a = value.a ?? 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return '#888888';
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Determine the smart default platform to display based on output configuration
 */
function getDefaultPlatform(platforms: string[], outputMode: string): string {
  if (!platforms || platforms.length === 0) return 'css';

  // CSS-in-JS mode - prefer OBJECT (nested) notation as most common for theme providers
  if (platforms.includes('json')) return 'json';

  // Mobile platforms - prefer iOS first (most common)
  if (platforms.includes('ios-swift') || platforms.includes('ios') || platforms.includes('swift')) {
    return platforms.find(p => ['ios-swift', 'ios', 'swift'].includes(p.toLowerCase())) || platforms[0];
  }
  if (platforms.includes('android')) return 'android';
  if (platforms.includes('compose')) return 'compose';
  if (platforms.includes('flutter')) return 'flutter';

  // Web platforms - prefer CSS
  if (platforms.includes('css')) return 'css';
  if (platforms.includes('scss')) return 'scss';
  if (platforms.includes('js') || platforms.includes('javascript')) return 'js';
  if (platforms.includes('ts') || platforms.includes('typescript')) return 'ts';

  // Default to first platform
  return platforms[0];
}

/**
 * Get platform label for display
 */
function getPlatformLabel(platform: string): string {
  const label = platform.toUpperCase();
  if (platform.toLowerCase() === 'json') {
    return 'OBJECT'; // More accurate for nested object access in JS/TS
  }
  return label;
}

/**
 * Generate HTML for platform-specific variable names with smart default
 */
function generatePlatformVariablesHtml(token: ParsedToken, defaultPlatform?: string): string {
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
      const label = getPlatformLabel(platform);
      return `<div class="docs-token-variable docs-token-variable--platform" data-platform="${escapeHtml(platform)}" data-copy="${escapeHtml(varName)}" style="${isActive ? '' : 'display: none;'}">${escapeHtml(varName)}</div>`;
    })
    .join('');
}

/**
 * Generate code block with platform variables for table cells
 */
function generatePlatformVariablesCode(token: ParsedToken, defaultPlatform?: string): string {
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
 * Generate the index/overview page
 */
export function generateIndexHTML(
  tokens: { colors: ParsedToken[]; typography: ParsedToken[]; spacing: ParsedToken[]; other: ParsedToken[]; all: ParsedToken[]; collections: Map<string, ParsedToken[]>; modes: Map<string, ParsedToken[]> },
  options: TemplateOptions
): string {
  const collections = Array.from(tokens.collections.entries());
  const modes = Array.from(tokens.modes.keys());

  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;
  
  const content = `
    ${options.metadata ? `
    <!-- Output Info -->
    <div class="docs-section" style="background: var(--docs-bg-elevated); border: 1px solid var(--docs-border); border-radius: 8px; padding: var(--docs-space-lg); margin-bottom: var(--docs-space-xl);">
      <h3 style="margin-top: 0; margin-bottom: var(--docs-space-md);">Output Configuration</h3>
      <div style="display: grid; gap: var(--docs-space-sm); font-size: 14px;">
        <div><strong>Mode:</strong> ${options.metadata.output.mode === 'style-dictionary' ? 'Style Dictionary' : 'JSON'}</div>
        <div><strong>CSS Variable Format:</strong> <code>${escapeHtml(options.metadata.variableNaming.example)}</code></div>
        <div><strong>Prefix:</strong> <code>${escapeHtml(options.metadata.variableNaming.prefix)}</code></div>
        ${options.metadata.output.styleDictionary?.platforms ? `<div><strong>Platforms:</strong> ${options.metadata.output.styleDictionary.platforms.join(', ')}</div>` : ''}
        ${options.metadata.output.css?.enabled ? `<div><strong>CSS Output:</strong> Enabled${options.metadata.output.css.transforms?.useRem ? ' (using rem units)' : ''}</div>` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Stats -->
    <div class="docs-stats">
      <div class="docs-stat-card">
        <div class="docs-stat-value">${tokens.all.length}</div>
        <div class="docs-stat-label">Total Tokens</div>
      </div>
      ${collections.map(([name, collTokens]) => `
        <div class="docs-stat-card docs-stat-card--clickable" onclick="window.location='${name.toLowerCase()}.html'">
          <div class="docs-stat-value">${collTokens.length}</div>
          <div class="docs-stat-label">${escapeHtml(capitalizeFirst(name))}</div>
        </div>
      `).join('')}
      <div class="docs-stat-card">
        <div class="docs-stat-value">${modes.length}</div>
        <div class="docs-stat-label">Modes</div>
      </div>
    </div>
    
    <!-- Collection previews -->
    ${collections.map(([name, collTokens]) => {
      // Determine collection type for appropriate preview
      const hasColors = collTokens.some(t => t.type.toLowerCase() === 'color');
      const previewTokens = collTokens.slice(0, hasColors ? 10 : 6);
      
      return `
    <section class="docs-section">
      <div class="docs-section-header">
        <h2 class="docs-section-title">${escapeHtml(capitalizeFirst(name))}</h2>
        <span class="docs-section-count">${collTokens.length} tokens</span>
      </div>
      <div class="docs-token-grid">
        ${previewTokens.map(token => {
          const isColor = token.type.toLowerCase() === 'color';
          const isTypography = ['fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing'].includes(token.type.toLowerCase());
          const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
          const referenceHtml = token.referencePath 
            ? `<div class="docs-token-reference" data-copy="${escapeHtml(formatReferencePath(token.referencePath))}" title="References ${escapeHtml(token.referencePath)}">→ ${escapeHtml(formatReferencePath(token.referencePath))}</div>`
            : '';
          
          if (isColor) {
            return `
          <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}">
            <div class="docs-color-preview">
              <div class="docs-color-preview-inner" style="background: ${getColorBackground(displayValue)}"></div>
            </div>
            <div class="docs-token-info">
              <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
              ${referenceHtml}
              <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
                ${escapeHtml(formatDisplayValue(displayValue, token.type))}
              </div>
              ${generatePlatformVariablesHtml(token, defaultPlatform)}
            </div>
          </div>`;
          }

          if (isTypography) {
            return `
          <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}">
            <div class="docs-typography-preview" style="${getTypographyStyle(token)}">
              Aa Bb Cc
            </div>
            <div class="docs-token-info">
              <div class="docs-token-name">${escapeHtml(token.path.split('.').pop() || token.path)}</div>
              ${referenceHtml}
              <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
                ${escapeHtml(formatDisplayValue(displayValue, token.type))}
              </div>
              ${generatePlatformVariablesHtml(token, defaultPlatform)}
            </div>
          </div>`;
          }

          // Generic token
          return `
          <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}">
            <div class="docs-token-info" style="padding-top: var(--docs-space-lg);">
              <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
              ${referenceHtml}
              <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
                ${escapeHtml(formatDisplayValue(displayValue, token.type))}
              </div>
              ${generatePlatformVariablesHtml(token, defaultPlatform)}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${collTokens.length > previewTokens.length ? `<p style="margin-top: var(--docs-space-md); color: var(--docs-text-muted);">+ ${collTokens.length - previewTokens.length} more tokens. <a href="${name.toLowerCase()}.html">View all →</a></p>` : ''}
    </section>
    `;
    }).join('')}
  `;

  return layout(content, options, 'index');
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
 * Group tokens hierarchically by path segments
 * Returns a nested structure: { groupName: { subGroupName: tokens[] } }
 */
function groupTokensHierarchically(tokens: ParsedToken[]): Map<string, Map<string, ParsedToken[]>> {
  const result = new Map<string, Map<string, ParsedToken[]>>();
  
  for (const token of tokens) {
    const parts = token.path.split('.');
    // Get primary group (first segment, e.g., "color")
    const primaryGroup = parts[0] || token.collection || 'other';
    // Get secondary group (second segment, e.g., "primary", "neutral")
    const secondaryGroup = parts.length > 2 ? parts[1] : '_root';
    
    if (!result.has(primaryGroup)) {
      result.set(primaryGroup, new Map());
    }
    const primaryMap = result.get(primaryGroup)!;
    
    if (!primaryMap.has(secondaryGroup)) {
      primaryMap.set(secondaryGroup, []);
    }
    primaryMap.get(secondaryGroup)!.push(token);
  }
  
  return result;
}

/**
 * Determine if a token is a color type
 */
function isColorToken(token: ParsedToken): boolean {
  return token.type.toLowerCase() === 'color';
}

/**
 * Determine if a token is a typography type
 */
function isTypographyToken(token: ParsedToken): boolean {
  const type = token.type.toLowerCase();
  return ['fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing', 'typography'].includes(type);
}

/**
 * Determine if a token is a spacing/dimension type
 */
function isSpacingToken(token: ParsedToken): boolean {
  const type = token.type.toLowerCase();
  const path = token.path.toLowerCase();
  return type === 'dimension' || type === 'spacing' || 
         path.includes('spacing') || path.includes('space') || path.includes('gap');
}

/**
 * Generate a collection page with appropriate rendering based on token types
 */
export function generateCollectionPage(
  collectionName: string,
  tokens: ParsedToken[],
  options: TemplateOptions
): string {
  // Determine the primary type of tokens in this collection
  const hasColors = tokens.some(isColorToken);
  const hasTypography = tokens.some(isTypographyToken);
  const hasSpacing = tokens.some(isSpacingToken);

  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;

  // Group hierarchically by path segments
  const grouped = groupTokensHierarchically(tokens);

  const content = `
    ${Array.from(grouped.entries()).map(([primaryGroup, subGroups]) => {
      const totalTokens = Array.from(subGroups.values()).reduce((sum, t) => sum + t.length, 0);
      const hasSubGroups = subGroups.size > 1 || !subGroups.has('_root');
      
      return `
      <section class="docs-section">
        <div class="docs-section-header">
          <h2 class="docs-section-title">${escapeHtml(capitalizeFirst(primaryGroup))}</h2>
          <span class="docs-section-count">${totalTokens} tokens</span>
        </div>
        
        ${Array.from(subGroups.entries()).map(([subGroup, subTokens]) => {
          const showSubHeader = hasSubGroups && subGroup !== '_root';
          return `
          ${showSubHeader ? `
          <div class="docs-subsection">
            <div class="docs-subsection-header">
              <h3 class="docs-subsection-title">${escapeHtml(capitalizeFirst(subGroup))}</h3>
              <span class="docs-subsection-count">${subTokens.length}</span>
            </div>
          </div>
          ` : ''}
          <div class="docs-token-grid${showSubHeader ? ' docs-token-grid--subsection' : ''}">
            ${subTokens.map(token => renderTokenCard(token, hasColors, hasTypography, defaultPlatform)).join('')}
          </div>
          `;
        }).join('')}
      </section>
    `;
    }).join('')}
  `;

  return layout(content, options, collectionName.toLowerCase());
}

/**
 * Render a token card with appropriate preview based on type
 */
function renderTokenCard(token: ParsedToken, collectionHasColors: boolean, collectionHasTypography: boolean, defaultPlatform?: string): string {
  const isColor = isColorToken(token);
  const isTypo = isTypographyToken(token);

  // Use resolved value for display if token is a reference
  const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
  const referenceHtml = token.referencePath
    ? `<div class="docs-token-reference" data-copy="${escapeHtml(formatReferencePath(token.referencePath))}" title="References ${escapeHtml(token.referencePath)}">→ ${escapeHtml(formatReferencePath(token.referencePath))}</div>`
    : '';

  if (isColor) {
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
          ${generatePlatformVariablesHtml(token, defaultPlatform)}
        </div>
      </div>
    `;
  }

  if (isTypo) {
    return `
      <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
        <div class="docs-typography-preview" style="${getTypographyStyle(token)}">
          Aa Bb Cc
        </div>
        <div class="docs-token-info">
          <div class="docs-token-name">${escapeHtml(token.path.split('.').pop() || token.path)}</div>
          ${referenceHtml}
          <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
            ${escapeHtml(formatDisplayValue(displayValue, token.type))}
          </div>
          ${generatePlatformVariablesHtml(token, defaultPlatform)}
        </div>
      </div>
    `;
  }

  // Default: generic token card
  return `
    <div class="docs-token-card${token.referencePath ? ' docs-token-card--reference' : ''}" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
      <div class="docs-token-info" style="padding-top: var(--docs-space-lg);">
        <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
        ${referenceHtml}
        <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">
          ${escapeHtml(formatDisplayValue(displayValue, token.type))}
        </div>
        ${generatePlatformVariablesHtml(token, defaultPlatform)}
      </div>
    </div>
  `;
}

/**
 * Generate the colors page
 */
export function generateColorPage(colors: ParsedToken[], options: TemplateOptions): string {
  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;

  // Group hierarchically by path segments
  const grouped = groupTokensHierarchically(colors);

  const content = `
    ${Array.from(grouped.entries()).map(([primaryGroup, subGroups]) => {
      const totalTokens = Array.from(subGroups.values()).reduce((sum, tokens) => sum + tokens.length, 0);
      const hasSubGroups = subGroups.size > 1 || !subGroups.has('_root');
      
      return `
      <section class="docs-section">
        <div class="docs-section-header">
          <h2 class="docs-section-title">${escapeHtml(capitalizeFirst(primaryGroup))}</h2>
          <span class="docs-section-count">${totalTokens} tokens</span>
        </div>
        
        ${Array.from(subGroups.entries()).map(([subGroup, tokens]) => {
          const showSubHeader = hasSubGroups && subGroup !== '_root';
          return `
          ${showSubHeader ? `
          <div class="docs-subsection">
            <div class="docs-subsection-header">
              <h3 class="docs-subsection-title">${escapeHtml(capitalizeFirst(subGroup))}</h3>
              <span class="docs-subsection-count">${tokens.length}</span>
            </div>
          </div>
          ` : ''}
          <div class="docs-token-grid${showSubHeader ? ' docs-token-grid--subsection' : ''}">
            ${tokens.map(token => `
              <div class="docs-token-card" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
                <div class="docs-color-preview">
                  <div class="docs-color-preview-inner" style="background: ${getColorBackground(token.value)}"></div>
                </div>
                <div class="docs-token-info">
                  <div class="docs-token-name">${escapeHtml(token.path.split('.').slice(-2).join('.') || token.path)}</div>
                  <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(token.value, token.type))}">
                    ${escapeHtml(formatDisplayValue(token.value, token.type))}
                  </div>
                  ${generatePlatformVariablesHtml(token, defaultPlatform)}
                </div>
              </div>
            `).join('')}
          </div>
          `;
        }).join('')}
      </section>
    `;
    }).join('')}
  `;

  return layout(content, options, 'colors');
}

/**
 * Generate the typography page
 */
export function generateTypographyPage(typography: ParsedToken[], options: TemplateOptions): string {
  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;

  // Group by type
  const grouped = new Map<string, ParsedToken[]>();
  for (const token of typography) {
    const group = token.type;
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(token);
  }

  const content = `
    ${Array.from(grouped.entries()).map(([group, tokens]) => `
      <section class="docs-section">
        <div class="docs-section-header">
          <h2 class="docs-section-title">${escapeHtml(formatTypeName(group))}</h2>
          <span class="docs-section-count">${tokens.length} tokens</span>
        </div>
        <div class="docs-token-grid">
          ${tokens.map(token => `
            <div class="docs-token-card" data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
              <div class="docs-typography-preview" style="${getTypographyStyle(token)}">
                The quick brown fox
              </div>
              <div class="docs-token-info">
                <div class="docs-token-name">${escapeHtml(token.path.split('.').pop() || token.path)}</div>
                <div class="docs-token-value" data-copy="${escapeHtml(formatDisplayValue(token.value, token.type))}">
                  ${escapeHtml(formatDisplayValue(token.value, token.type))}
                </div>
                ${generatePlatformVariablesHtml(token, defaultPlatform)}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('')}
  `;

  return layout(content, options, 'typography');
}

function formatTypeName(type: string): string {
  const names: Record<string, string> = {
    'fontsize': 'Font Sizes',
    'fontfamily': 'Font Families',
    'fontweight': 'Font Weights',
    'lineheight': 'Line Heights',
    'letterspacing': 'Letter Spacing',
    'typography': 'Typography',
  };
  return names[type.toLowerCase()] || capitalizeFirst(type);
}

/**
 * Generate the spacing page
 */
export function generateSpacingPage(spacing: ParsedToken[], options: TemplateOptions): string {
  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;

  const content = `
    <section class="docs-section">
      <div class="docs-section-header">
        <h2 class="docs-section-title">Spacing Scale</h2>
        <span class="docs-section-count">${spacing.length} tokens</span>
      </div>
      
      <table class="docs-token-table">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Name</th>
            <th>Value</th>
            <th>CSS Variable</th>
          </tr>
        </thead>
        <tbody>
          ${spacing.map(token => {
            const value = typeof token.value === 'number' ? token.value : parseInt(token.value) || 16;
            const displayValue = formatDisplayValue(token.value, token.type);
            return `
              <tr data-token="${escapeHtml(token.path)}" data-mode="${token.mode}">
                <td>
                  <div class="docs-spacing-box" style="width: ${Math.min(value, 200)}px; height: 24px;"></div>
                </td>
                <td><strong>${escapeHtml(token.path.split('.').pop() || token.path)}</strong></td>
                <td>
                  <code data-copy="${escapeHtml(displayValue)}">${escapeHtml(displayValue)}</code>
                </td>
                <td>
                  ${generatePlatformVariablesCode(token, defaultPlatform)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;

  return layout(content, options, 'spacing');
}

/**
 * Generate the all tokens page
 */
export function generateAllTokensPage(allTokens: ParsedToken[], options: TemplateOptions): string {
  // Determine default platform for smart display
  const platforms = options.metadata?.output.styleDictionary?.platforms || [];
  const outputMode = options.metadata?.output.mode || 'json';
  const defaultPlatform = platforms.length > 0 ? getDefaultPlatform(platforms, outputMode) : undefined;

  const content = `
    <section class="docs-section">
      <div class="docs-section-header">
        <h2 class="docs-section-title">All Tokens</h2>
        <span class="docs-section-count">${allTokens.length} tokens</span>
      </div>
      
      <table class="docs-token-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Type</th>
            <th>Value</th>
            <th>Reference</th>
            <th>Collection</th>
            <th>Mode</th>
            <th>CSS Variable</th>
          </tr>
        </thead>
        <tbody>
          ${allTokens.map(token => {
            const displayValue = token.resolvedValue !== undefined ? token.resolvedValue : token.value;
            return `
            <tr data-token="${escapeHtml(token.path)}" data-mode="${token.mode}"${token.referencePath ? ' class="docs-table-row--reference"' : ''}>
              <td><strong>${escapeHtml(token.path)}</strong></td>
              <td><code>${escapeHtml(token.type)}</code></td>
              <td>
                ${token.type.toLowerCase() === 'color' ? 
                  `<span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; border-radius: 4px; background: ${getColorBackground(displayValue)}; border: 1px solid var(--docs-border);"></span>
                    <code data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">${escapeHtml(formatDisplayValue(displayValue, token.type))}</code>
                  </span>` :
                  `<code data-copy="${escapeHtml(formatDisplayValue(displayValue, token.type))}">${escapeHtml(formatDisplayValue(displayValue, token.type))}</code>`
                }
              </td>
              <td>
                ${token.referencePath 
                  ? `<code class="docs-table-reference" data-copy="${escapeHtml(formatReferencePath(token.referencePath))}" title="References ${escapeHtml(token.referencePath)}">→ ${escapeHtml(formatReferencePath(token.referencePath))}</code>`
                  : '–'
                }
              </td>
              <td>${escapeHtml(token.collection)}</td>
              <td>${escapeHtml(token.mode)}</td>
              <td>
                ${generatePlatformVariablesCode(token, defaultPlatform)}
              </td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </section>
  `;

  return layout(content, options, 'all');
}
