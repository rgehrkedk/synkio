/**
 * HTML Generator for Documentation Pages
 *
 * This module generates HTML pages for the token documentation site.
 * It uses modular components from ./components/ for building the UI.
 */
import { ParsedToken } from './index.js';
import {
  TemplateOptions,
  layout,
  escapeHtml,
  capitalizeFirst,
  formatDisplayValue,
  formatReferencePath,
  getColorBackground,
  renderTokenCard,
  renderPlatformVariablesCode,
  renderModeToggle,
  renderCollectionModeToggles
} from './components/index.js';

// Re-export types for backwards compatibility
export type { TemplateOptions };

/**
 * Group tokens hierarchically by path segments
 * Returns a nested structure: { groupName: { subGroupName: tokens[] } }
 */
function groupTokensHierarchically(tokens: ParsedToken[]): Map<string, Map<string, ParsedToken[]>> {
  const result = new Map<string, Map<string, ParsedToken[]>>();

  for (const token of tokens) {
    const parts = token.path.split('.');
    const primaryGroup = parts[0] || token.collection || 'other';
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
 * Helper to get default platform from options
 * Returns 'json' as default since we always have JSON path format
 */
function resolveDefaultPlatform(_options: TemplateOptions): string {
  return 'json';
}

/**
 * Get unique modes from a collection of tokens
 */
function getModesFromTokens(tokens: ParsedToken[]): string[] {
  const modes = new Set<string>();
  for (const token of tokens) {
    modes.add(token.mode);
  }
  return Array.from(modes);
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
  const defaultPlatform = resolveDefaultPlatform(options);

  // Build per-collection modes map for the overview page toggles
  const collectionModes = new Map<string, string[]>();
  for (const [collName, collTokens] of tokens.collections) {
    const collModes = getModesFromTokens(collTokens);
    collectionModes.set(collName, collModes);
  }

  // Render per-collection mode toggles
  const modeToggleHtml = renderCollectionModeToggles({
    collectionModes,
    defaultMode: options.defaultMode
  });

  const content = `
    ${options.metadata ? `
    <!-- Output Configuration -->
    <div class="docs-config-grid">
      <div class="docs-config-card">
        <h4 class="docs-config-title">Source</h4>
        <dl class="docs-config-list">
          <dt>Figma File</dt>
          <dd><code>${escapeHtml(options.metadata.source.figmaFileId)}</code></dd>
          ${options.metadata.source.figmaNodeId ? `
          <dt>Node ID</dt>
          <dd><code>${escapeHtml(options.metadata.source.figmaNodeId)}</code></dd>
          ` : ''}
          <dt>Collections</dt>
          <dd>${options.metadata.collections.map(c => `<span class="docs-tag">${escapeHtml(capitalizeFirst(c))}</span>`).join(' ')}</dd>
          <dt>Modes</dt>
          <dd>${options.metadata.modes.map(m => `<span class="docs-tag">${escapeHtml(capitalizeFirst(m))}</span>`).join(' ')}</dd>
        </dl>
      </div>

      <div class="docs-config-card">
        <h4 class="docs-config-title">Output Format</h4>
        <dl class="docs-config-list">
          <dt>DTCG Format</dt>
          <dd>${options.metadata.output.dtcg ? '<span class="docs-tag docs-tag--success">Enabled</span>' : '<span class="docs-tag">Disabled</span>'}</dd>
          <dt>Output Directory</dt>
          <dd><code>${escapeHtml(options.metadata.output.dir)}</code></dd>
        </dl>
      </div>

      ${options.metadata.variableNaming ? `
      <div class="docs-config-card">
        <h4 class="docs-config-title">Variable Naming</h4>
        <dl class="docs-config-list">
          <dt>Prefix</dt>
          <dd><code>${escapeHtml(options.metadata.variableNaming.prefix)}</code></dd>
          <dt>Separator</dt>
          <dd><code>${escapeHtml(options.metadata.variableNaming.separator)}</code></dd>
          <dt>Example</dt>
          <dd><code>${escapeHtml(options.metadata.variableNaming.example)}</code></dd>
        </dl>
      </div>
      ` : ''}

      ${options.metadata.output.css?.enabled ? `
      <div class="docs-config-card">
        <h4 class="docs-config-title">CSS Output</h4>
        <dl class="docs-config-list">
          <dt>Status</dt>
          <dd><span class="docs-tag docs-tag--success">Enabled</span></dd>
          ${options.metadata.output.css.file ? `
          <dt>File</dt>
          <dd><code>${escapeHtml(options.metadata.output.css.file)}</code></dd>
          ` : ''}
          ${options.metadata.output.css.transforms?.useRem ? `
          <dt>Units</dt>
          <dd><span class="docs-tag">rem</span> (base: ${options.metadata.output.css.transforms.basePxFontSize || 16}px)</dd>
          ` : ''}
        </dl>
      </div>
      ` : ''}
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
      const hasColors = collTokens.some(t => t.type.toLowerCase() === 'color');
      const previewTokens = collTokens.slice(0, hasColors ? 10 : 6);

      return `
    <section class="docs-section" data-collection="${escapeHtml(name)}">
      <div class="docs-section-header">
        <h2 class="docs-section-title">${escapeHtml(capitalizeFirst(name))}</h2>
        <span class="docs-section-count">${collTokens.length} tokens</span>
      </div>
      <div class="docs-token-grid">
        ${previewTokens.map(token => renderTokenCard(token, defaultPlatform)).join('')}
      </div>
      ${collTokens.length > previewTokens.length ? `<p style="margin-top: var(--docs-space-md); color: var(--docs-text-muted);">+ ${collTokens.length - previewTokens.length} more tokens. <a href="${name.toLowerCase()}.html">View all →</a></p>` : ''}
    </section>
    `;
    }).join('')}
  `;

  return layout({ content, options, activePage: 'index', modeToggleHtml });
}

/**
 * Generate a collection page with appropriate rendering based on token types
 */
export function generateCollectionPage(
  collectionName: string,
  tokens: ParsedToken[],
  options: TemplateOptions
): string {
  const defaultPlatform = resolveDefaultPlatform(options);
  const grouped = groupTokensHierarchically(tokens);

  // Get modes for this specific collection
  const collectionModes = getModesFromTokens(tokens);

  // Only show mode toggle if this collection has multiple modes
  const modeToggleHtml = renderModeToggle({
    modes: collectionModes,
    defaultMode: options.defaultMode,
    collection: collectionName
  });

  const content = `
    ${Array.from(grouped.entries()).map(([primaryGroup, subGroups]) => {
      const totalTokens = Array.from(subGroups.values()).reduce((sum, t) => sum + t.length, 0);
      const hasSubGroups = subGroups.size > 1 || !subGroups.has('_root');

      return `
      <section class="docs-section" data-collection="${escapeHtml(collectionName)}">
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
            ${subTokens.map(token => renderTokenCard(token, defaultPlatform)).join('')}
          </div>
          `;
        }).join('')}
      </section>
    `;
    }).join('')}
  `;

  return layout({ content, options, activePage: collectionName.toLowerCase(), modeToggleHtml });
}

/**
 * Generate the all tokens page
 */
export function generateAllTokensPage(
  allTokens: ParsedToken[],
  options: TemplateOptions,
  collections?: Map<string, ParsedToken[]>
): string {
  const defaultPlatform = resolveDefaultPlatform(options);

  // Build per-collection modes map (same as overview page)
  const collectionModes = new Map<string, string[]>();
  if (collections) {
    for (const [collName, collTokens] of collections) {
      const collModes = getModesFromTokens(collTokens);
      collectionModes.set(collName, collModes);
    }
  } else {
    // Fallback: group tokens by collection from the flat list
    const collectionTokens = new Map<string, ParsedToken[]>();
    for (const token of allTokens) {
      if (!collectionTokens.has(token.collection)) {
        collectionTokens.set(token.collection, []);
      }
      collectionTokens.get(token.collection)!.push(token);
    }
    for (const [collName, tokens] of collectionTokens) {
      collectionModes.set(collName, getModesFromTokens(tokens));
    }
  }

  // Render per-collection mode toggles (same as overview)
  const modeToggleHtml = renderCollectionModeToggles({
    collectionModes,
    defaultMode: options.defaultMode
  });

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
            <tr data-token="${escapeHtml(token.path)}" data-mode="${token.mode}" data-collection="${escapeHtml(token.collection)}"${token.referencePath ? ' class="docs-table-row--reference"' : ''}>
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
                ${renderPlatformVariablesCode(token, defaultPlatform)}
              </td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </section>
  `;

  return layout({ content, options, activePage: 'all', modeToggleHtml });
}
