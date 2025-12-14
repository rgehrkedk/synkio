/**
 * Multi-Collection Level Configuration Component
 * Shows one level selector card per collection for multi-file imports
 */

import { getState, setState } from '../state.js';
import { sendMessage } from '../message-bridge.js';
import { renderLevelSelector } from './level-selector.js';
import type { FileGroup, LevelConfiguration } from '../../types/level-config.types.js';

interface CollectionAnalysisState {
  groupId: string;
  collectionName: string;
  analyzed: boolean;
  levels?: LevelConfiguration[];
  modeStrategy: 'per-file' | 'merged';
  modeNames: Record<string, string>; // fileName -> modeName
}

let analysisStates: Map<string, CollectionAnalysisState> = new Map();
let currentAnalyzingIndex = 0;

/**
 * Extract mode name from filename (UI-side version)
 */
function extractModeNameFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.json$/i, '');
  
  if (nameWithoutExt.includes('-')) {
    const parts = nameWithoutExt.split('-');
    if (parts.length >= 2) return parts[parts.length - 1];
  }
  if (nameWithoutExt.includes('.')) {
    const parts = nameWithoutExt.split('.');
    if (parts.length >= 2) return parts[parts.length - 1];
  }
  if (nameWithoutExt.includes('_')) {
    const parts = nameWithoutExt.split('_');
    if (parts.length >= 2) return parts[parts.length - 1];
  }
  return nameWithoutExt;
}

/**
 * Initialize and render multi-collection configuration UI
 */
export function renderMultiCollectionConfig(): void {
  const container = document.getElementById('multiCollectionConfigSection');
  if (!container) {
    console.error('[MultiCollectionConfig] Container not found');
    return;
  }

  const state = getState();
  const groups = state.fileGroups || [];

  if (groups.length === 0) {
    console.error('[MultiCollectionConfig] No file groups found');
    return;
  }

  console.log('[MultiCollectionConfig] Rendering config for', groups.length, 'collections');

  // Initialize analysis states with mode names extracted from filenames
  analysisStates.clear();
  groups.forEach(group => {
    const modeNames: Record<string, string> = {};
    group.fileNames.forEach(fileName => {
      modeNames[fileName] = extractModeNameFromFilename(fileName);
    });
    
    analysisStates.set(group.id, {
      groupId: group.id,
      collectionName: group.collectionName,
      analyzed: false,
      modeStrategy: group.fileNames.length > 1 ? 'per-file' : 'merged',
      modeNames
    });
  });

  container.style.display = 'block';
  renderUI(container, groups);

  // Start analyzing first collection
  currentAnalyzingIndex = 0;
  analyzeNextCollection();
}

/**
 * Render the multi-collection configuration UI
 */
function renderUI(container: HTMLElement, groups: FileGroup[]): void {
  container.innerHTML = `
    <div class="multi-collection-config">
      <div class="section-title">3. Configure Each Collection</div>
      <div class="section-description">
        Define how JSON levels map to Figma collections and modes for each collection.
      </div>

      <div id="collectionCards">
        ${groups.map(group => renderCollectionCard(group)).join('')}
      </div>

      <div class="collection-actions">
        <button class="button button-primary button-full" id="importAllBtn" disabled>
          Import All Collections
        </button>
      </div>
    </div>
  `;

  // Attach event listeners
  const importBtn = document.getElementById('importAllBtn');
  importBtn?.addEventListener('click', handleImportAll);
  
  // Attach mode strategy listeners
  attachModeStrategyListeners();
}

/**
 * Render a single collection card
 */
function renderCollectionCard(group: FileGroup): string {
  const analysisState = analysisStates.get(group.id);
  const hasMultipleFiles = group.fileNames.length > 1;
  const modeStrategy = analysisState?.modeStrategy || 'per-file';
  const fileCount = group.fileNames.length;

  // Build mode strategy section HTML for multi-file groups
  let modeStrategySectionHtml = '';
  if (hasMultipleFiles) {
    const modeNamesHtml = modeStrategy === 'per-file' 
      ? renderModeNamesList(group.id, group.fileNames, analysisState?.modeNames || {})
      : '';
    
    modeStrategySectionHtml = `
      <div class="mode-strategy-section">
        <div class="mode-strategy-label">How should these ${fileCount} files be combined?</div>
        <div class="mode-strategy-options">
          <label class="mode-strategy-option ${modeStrategy === 'per-file' ? 'selected' : ''}">
            <input type="radio" name="mode-strategy-${escapeHtml(group.id)}" 
                   value="per-file" ${modeStrategy === 'per-file' ? 'checked' : ''}
                   data-group-id="${escapeHtml(group.id)}">
            <span class="radio-indicator"></span>
            <div class="option-content">
              <div class="option-title">Each file = 1 mode</div>
              <div class="option-description">Creates ${fileCount} modes in this collection</div>
            </div>
          </label>
          <label class="mode-strategy-option ${modeStrategy === 'merged' ? 'selected' : ''}">
            <input type="radio" name="mode-strategy-${escapeHtml(group.id)}" 
                   value="merged" ${modeStrategy === 'merged' ? 'checked' : ''}
                   data-group-id="${escapeHtml(group.id)}">
            <span class="radio-indicator"></span>
            <div class="option-content">
              <div class="option-title">Merge into 1 mode</div>
              <div class="option-description">All tokens combined into "Mode 1"</div>
            </div>
          </label>
        </div>
        ${modeNamesHtml}
      </div>
    `;
  }

  // Build structure section HTML
  // For multi-file collections, show simplified structure (just Token Path since mode comes from files)
  // For single-file collections, show full level selector with Collection/Mode/Token Path options
  const structureLabel = hasMultipleFiles ? 'Structure inside each file:' : 'Token structure:';
  
  let structureContentHtml = '';
  if (!analysisState?.analyzed) {
    structureContentHtml = `<div class="analyzing"><span class="spinner"></span> Analyzing structure...</div>`;
  } else if (hasMultipleFiles && modeStrategy === 'per-file') {
    // Simplified view for multi-file: just show token path structure
    structureContentHtml = renderSimplifiedStructure(group.id, analysisState.levels || []);
  } else {
    // Full level selector for single-file or merged mode
    structureContentHtml = `<div id="level-selector-${escapeHtml(group.id)}"></div>`;
  }
  
  const structureSectionHtml = `
    <div class="structure-section">
      <div class="structure-label">${structureLabel}</div>
      <div class="structure-content">
        ${structureContentHtml}
      </div>
    </div>
  `;

  // Build file list for header
  const fileListShort = group.fileNames.length <= 2 
    ? group.fileNames.map(f => `${f}.json`).join(', ')
    : `${group.fileNames[0]}.json + ${group.fileNames.length - 1} more`;

  return `
    <div class="collection-card" id="collection-${escapeHtml(group.id)}">
      <div class="collection-header">
        <div class="collection-icon">📦</div>
        <div class="collection-info">
          <div class="collection-name">${escapeHtml(group.collectionName)}</div>
          <div class="collection-files">${fileCount} file${fileCount > 1 ? 's' : ''}: ${escapeHtml(fileListShort)}</div>
        </div>
        <div class="collection-badge">${hasMultipleFiles ? `${fileCount} files` : '1 file'}</div>
      </div>
      <div class="collection-body" id="collection-body-${escapeHtml(group.id)}">
        ${modeStrategySectionHtml}
        ${structureSectionHtml}
      </div>
    </div>
  `;
}

/**
 * Render mode names list for per-file strategy
 */
function renderModeNamesList(groupId: string, fileNames: string[], modeNames: Record<string, string>): string {
  return `
    <div class="mode-names-list">
      <div class="mode-names-label">Mode names (editable):</div>
      ${fileNames.map(fileName => `
        <div class="mode-name-row">
          <span class="mode-name-file">${escapeHtml(fileName)}.json</span>
          <span class="mode-name-arrow">→</span>
          <input type="text" class="mode-name-input" 
                 value="${escapeHtml(modeNames[fileName] || extractModeNameFromFilename(fileName))}"
                 data-group-id="${escapeHtml(groupId)}"
                 data-file-name="${escapeHtml(fileName)}"
                 placeholder="Mode name">
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render simplified structure preview for multi-file "each file = 1 mode" scenario
 * Shows only Token Path structure since mode is determined by the file
 */
function renderSimplifiedStructure(groupId: string, levels: LevelConfiguration[]): string {
  if (levels.length === 0) {
    return '<div class="no-structure">No structure detected</div>';
  }
  
  return `
    <div class="simplified-structure" id="simplified-structure-${escapeHtml(groupId)}">
      ${levels.map(level => {
        const displayKeys = (level.exampleKeys || []).slice(0, 5).join(', ');
        const moreCount = (level.keyCount || 0) > 5 ? (level.keyCount || 0) - 5 : 0;
        const keysDisplay = moreCount > 0 ? `${displayKeys}... (+${moreCount} more)` : displayKeys;
        
        return `
          <div class="structure-level">
            <div class="structure-level-header">
              <span class="structure-level-label">Level ${level.depth}:</span>
              <span class="structure-level-count">${level.keyCount || 0} keys</span>
            </div>
            <div class="structure-level-keys">${escapeHtml(keysDisplay)}</div>
            <div class="structure-level-role">
              <span class="role-indicator">→</span>
              <span class="role-label">Token Path</span>
            </div>
          </div>
        `;
      }).join('')}
      <div class="structure-info">
        <span class="info-icon">💡</span>
        <span class="info-text">Mode is determined by the file (each file = 1 mode)</span>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for mode strategy changes
 */
function attachModeStrategyListeners(): void {
  // Mode strategy radio buttons
  document.querySelectorAll('input[type="radio"][name^="mode-strategy-"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const groupId = target.dataset.groupId;
      const strategy = target.value as 'per-file' | 'merged';
      
      if (groupId) {
        handleModeStrategyChange(groupId, strategy);
      }
    });
  });
  
  // Mode name inputs
  document.querySelectorAll('.mode-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const groupId = target.dataset.groupId;
      const fileName = target.dataset.fileName;
      const newName = target.value;
      
      if (groupId && fileName) {
        handleModeNameChange(groupId, fileName, newName);
      }
    });
  });
}

/**
 * Handle mode strategy change
 */
function handleModeStrategyChange(groupId: string, strategy: 'per-file' | 'merged'): void {
  console.log('[MultiCollectionConfig] Mode strategy changed:', groupId, strategy);
  
  const analysisState = analysisStates.get(groupId);
  if (analysisState) {
    analysisState.modeStrategy = strategy;
  }
  
  // Update the file group in state
  const state = getState();
  const groups = state.fileGroups || [];
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.modeStrategy = strategy;
    setState({ fileGroups: groups });
  }
  
  // Re-render the card to show/hide mode names list
  reRenderCollectionCard(groupId);
}

/**
 * Handle mode name change
 */
function handleModeNameChange(groupId: string, fileName: string, newName: string): void {
  console.log('[MultiCollectionConfig] Mode name changed:', groupId, fileName, '->', newName);
  
  const analysisState = analysisStates.get(groupId);
  if (analysisState) {
    analysisState.modeNames[fileName] = newName;
  }
}

/**
 * Re-render a single collection card
 */
function reRenderCollectionCard(groupId: string): void {
  const state = getState();
  const groups = state.fileGroups || [];
  const group = groups.find(g => g.id === groupId);
  
  if (!group) return;
  
  const cardElement = document.getElementById(`collection-${groupId}`);
  if (cardElement) {
    cardElement.outerHTML = renderCollectionCard(group);
    
    // Re-render level selector if analyzed and NOT using simplified structure
    const analysisState = analysisStates.get(groupId);
    const hasMultipleFiles = group.fileNames.length > 1;
    const modeStrategy = analysisState?.modeStrategy || 'per-file';
    
    // Only render full level selector for single-file or merged mode
    // Multi-file "per-file" mode uses simplified structure (already rendered inline)
    if (analysisState?.analyzed && analysisState.levels && !(hasMultipleFiles && modeStrategy === 'per-file')) {
      renderLevelSelector(
        analysisState.levels.map(level => ({
          depth: level.depth,
          exampleKeys: level.exampleKeys || [],
          keyCount: level.keyCount || 0
        })),
        {
          containerId: `level-selector-${groupId}`,
          compact: true,
          onConfigChange: (config) => {
            // Store the updated config in the analysis state for this group
            const state = analysisStates.get(groupId);
            if (state) {
              state.levels = config;
            }
          }
        }
      );
    }
    
    // Re-attach listeners for this card
    attachModeStrategyListeners();
  }
}

/**
 * Analyze next collection in sequence
 */
function analyzeNextCollection(): void {
  const state = getState();
  const groups = state.fileGroups || [];

  if (currentAnalyzingIndex >= groups.length) {
    console.log('[MultiCollectionConfig] All collections analyzed');
    enableImportButton();
    return;
  }

  const group = groups[currentAnalyzingIndex];
  const firstFileName = group.fileNames[0];
  const file = state.files.get(firstFileName);

  if (!file) {
    console.error('[MultiCollectionConfig] File not found:', firstFileName);
    currentAnalyzingIndex++;
    analyzeNextCollection();
    return;
  }

  console.log('[MultiCollectionConfig] Analyzing collection:', group.collectionName, 'file:', firstFileName);

  // Send analysis request
  sendMessage({
    type: 'analyze-structure',
    fileName: firstFileName,
    jsonData: file.content,
    metadata: { groupId: group.id } // Pass groupId so we know which collection this is for
  });
}

/**
 * Handle structure analyzed for a specific collection
 */
export function handleCollectionStructureAnalyzed(msg: {
  fileName: string;
  levels: LevelConfiguration[];
  metadata?: { groupId: string };
}): void {
  const groupId = msg.metadata?.groupId;
  if (!groupId) {
    console.error('[MultiCollectionConfig] No groupId in structure analysis response');
    return;
  }

  console.log('[MultiCollectionConfig] Structure analyzed for collection:', groupId);

  // Update analysis state
  const analysisState = analysisStates.get(groupId);
  if (analysisState) {
    analysisState.analyzed = true;
    analysisState.levels = msg.levels;
  }

  // Re-render the full collection card (includes mode strategy section)
  reRenderCollectionCard(groupId);

  // Move to next collection
  currentAnalyzingIndex++;
  analyzeNextCollection();
}

/**
 * Enable import button once all collections are analyzed
 */
function enableImportButton(): void {
  const importBtn = document.getElementById('importAllBtn') as HTMLButtonElement;
  if (importBtn) {
    importBtn.disabled = false;
    console.log('[MultiCollectionConfig] Import button enabled');
  }
}

/**
 * Handle import all collections
 */
function handleImportAll(): void {
  console.log('[MultiCollectionConfig] Import all collections clicked');

  const state = getState();
  const groups = state.fileGroups || [];

  // Collect level configurations for each group (as plain object for serialization)
  const levelsByGroup: Record<string, LevelConfiguration[]> = {};

  // Update groups with current modeStrategy and modeNames from analysisStates
  const updatedGroups = groups.map(group => {
    const analysisState = analysisStates.get(group.id);
    if (analysisState?.levels) {
      levelsByGroup[group.id] = analysisState.levels;
    }
    
    // Apply modeStrategy and modeNames from UI state
    return {
      ...group,
      modeStrategy: analysisState?.modeStrategy || 'per-file',
      modeNames: analysisState?.modeNames || {}
    };
  });

  // Collect file data from state (as plain object for serialization)
  const filesData: Record<string, unknown> = {};
  groups.forEach(group => {
    group.fileNames.forEach(fileName => {
      const fileInfo = state.files.get(fileName);
      if (fileInfo) {
        filesData[fileName] = fileInfo.content;
      }
    });
  });

  console.log('[MultiCollectionConfig] Sending import with', Object.keys(filesData).length, 'files');
  console.log('[MultiCollectionConfig] Groups with mode strategies:', updatedGroups.map(g => ({
    name: g.collectionName,
    strategy: g.modeStrategy,
    files: g.fileNames.length
  })));

  // Send import request
  sendMessage({
    type: 'import-with-manual-config',
    config: {
      multiFile: {
        groups: updatedGroups,
        levelsByGroup,
        filesData
      }
    }
  });
}

/**
 * Hide multi-collection config UI
 */
export function hideMultiCollectionConfig(): void {
  const container = document.getElementById('multiCollectionConfigSection');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
