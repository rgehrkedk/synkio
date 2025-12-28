// =============================================================================
// Apply Handlers - Import baseline and apply to Figma
// =============================================================================

import {
  BaselineData,
  SyncEvent,
  StyleType,
} from '../lib/types';

import {
  saveChunked,
  loadChunked,
  saveSimple,
  loadSimple,
  KEYS,
  saveForCLI,
} from '../lib/storage';

import {
  collectVariables,
  collectStyles,
} from '../lib/collector';

import { compareBaselines } from '../lib/compare';
import { buildBaseline, createOrUpdateVariable, createOrUpdateStyle } from '../operations';
import { SendMessage } from './types';

// =============================================================================
// handleImportBaseline - Import baseline from pasted/file content
// =============================================================================

export async function handleImportBaseline(
  data: string,
  send: SendMessage
): Promise<void> {
  try {
    const codeBaseline = JSON.parse(data) as BaselineData;

    if (!codeBaseline.baseline) {
      throw new Error('Invalid baseline format: missing baseline field');
    }

    // Save code baseline
    saveChunked(KEYS.CODE_BASELINE, codeBaseline);

    // Compare with current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const tokens = await collectVariables({ excludedCollections });
    const styles = await collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(tokens, styles);

    // Compare baselines using ID-based matching
    const diff = compareBaselines(currentBaseline, codeBaseline);

    send({
      type: 'import-complete',
      baseline: codeBaseline,
      diff,
    });
  } catch (error) {
    send({
      type: 'import-error',
      error: String(error),
    });
  }
}

// =============================================================================
// handleApplyToFigma - Apply code baseline to Figma variables and styles
// =============================================================================

export async function handleApplyToFigma(send: SendMessage): Promise<void> {
  send({ type: 'apply-started' });

  try {
    const codeBaseline = loadChunked<BaselineData>(KEYS.CODE_BASELINE);
    if (!codeBaseline) {
      throw new Error('No code baseline to apply');
    }

    // Get current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const currentTokens = await collectVariables({ excludedCollections });
    const currentStyles = await collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(currentTokens, currentStyles);

    // Compare to get diff using ID-based matching
    const diff = compareBaselines(currentBaseline, codeBaseline);

    let created = 0;
    let updated = 0;
    let renamed = 0;

    // Apply new variables
    for (const newVar of diff.newVariables) {
      await createOrUpdateVariable(newVar);
      created++;
    }

    // Apply value changes
    for (const change of diff.valueChanges) {
      await createOrUpdateVariable({
        ...change,
        value: change.newValue,
      });
      updated++;
    }

    // Apply path changes (renames)
    for (const pathChange of diff.pathChanges) {
      const variable = await figma.variables.getVariableByIdAsync(pathChange.variableId);
      if (variable) {
        // Figma uses / as path separator, not .
        const newName = pathChange.newPath.replace(/\./g, '/');
        variable.name = newName;
        renamed++;
      }
    }

    // Apply new styles
    for (const newStyle of diff.newStyles) {
      if (codeBaseline.styles) {
        await createOrUpdateStyle(codeBaseline.styles, newStyle);
        created++;
      }
    }

    // Apply style value changes
    for (const styleChange of diff.styleValueChanges) {
      if (codeBaseline.styles) {
        await createOrUpdateStyle(codeBaseline.styles, {
          ...styleChange,
          value: styleChange.newValue,
        });
        updated++;
      }
    }

    // Apply style path changes (renames)
    for (const stylePathChange of diff.stylePathChanges) {
      const style = await figma.getStyleByIdAsync(stylePathChange.styleId) as PaintStyle | TextStyle | EffectStyle | null;
      if (style) {
        // Figma uses / as path separator, not .
        const newName = stylePathChange.newPath.replace(/\./g, '/');
        style.name = newName;
        renamed++;
      }
    }

    // Update history
    const user = figma.currentUser?.name || 'unknown';
    const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];

    const allChangePaths = [
      ...diff.newVariables.map(v => v.path),
      ...diff.valueChanges.map(v => v.path),
      ...diff.pathChanges.map(p => `${p.oldPath} -> ${p.newPath}`),
      ...diff.newStyles.map(s => `[style] ${s.path}`),
      ...diff.styleValueChanges.map(s => `[style] ${s.path}`),
      ...diff.stylePathChanges.map(s => `[style] ${s.oldPath} -> ${s.newPath}`),
    ];

    const newEvent: SyncEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      user,
      direction: 'from-code',
      changeCount: created + updated + renamed,
      changes: allChangePaths.slice(0, 20),
    };

    const updatedHistory = [newEvent, ...history].slice(0, 10);
    saveSimple(KEYS.HISTORY, updatedHistory);

    // Update sync baseline after apply
    const newTokens = await collectVariables({ excludedCollections });
    const newStyles = await collectStyles({ excludedStyleTypes });
    const newSyncBaseline = buildBaseline(newTokens, newStyles);
    saveChunked(KEYS.SYNC_BASELINE, newSyncBaseline);

    // Also save in CLI-readable format
    saveForCLI({
      version: '3.0.0',
      timestamp: newSyncBaseline.metadata.syncedAt,
      tokens: newTokens,
      styles: newStyles,
    });

    send({
      type: 'apply-complete',
      summary: { created, updated, renamed },
    });
  } catch (error) {
    send({
      type: 'apply-error',
      error: String(error),
    });
  }
}
