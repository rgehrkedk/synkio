// =============================================================================
// Sync Status Calculation
// =============================================================================

import {
  BaselineData,
  BaselineEntry,
  StyleBaselineEntry,
  PluginState,
  SyncEvent,
  StyleType,
  TokenEntry,
  StyleEntry,
} from '../lib/types';
import { loadChunked, loadSimple, KEYS } from '../lib/storage';
import { collectVariables, collectStyles } from '../lib/collector';
import { compareBaselines, countChanges } from '../lib/compare';
import { debug } from '../lib/debug';
import { SendMessage } from '../handlers/types';

/**
 * Build a baseline from tokens and styles
 */
function buildBaseline(tokens: TokenEntry[], styles: StyleEntry[]): BaselineData {
  const baseline: Record<string, BaselineEntry> = {};

  for (const token of tokens) {
    // Key format: variableId:collection.mode
    const key = token.variableId
      ? `${token.variableId}:${token.collection}.${token.mode}`
      : `${token.path}:${token.collection}.${token.mode}`;

    baseline[key] = {
      path: token.path,
      value: token.value,
      type: token.type,
      collection: token.collection,
      mode: token.mode,
      variableId: token.variableId,
      collectionId: token.collectionId,
      modeId: token.modeId,
      description: token.description,
      scopes: token.scopes,
      codeSyntax: token.codeSyntax,
    };
  }

  // Build styles baseline
  const stylesBaseline: Record<string, StyleBaselineEntry> = {};

  for (const style of styles) {
    // Key format: styleId
    const key = style.styleId;

    stylesBaseline[key] = {
      styleId: style.styleId,
      type: style.type,
      path: style.path,
      value: style.value,
      description: style.description,
    };
  }

  return {
    baseline,
    styles: Object.keys(stylesBaseline).length > 0 ? stylesBaseline : undefined,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };
}

/**
 * Recalculate sync status based on current Figma state vs stored baseline.
 * This is called after changing excluded collections/style types to update the UI.
 */
export async function recalculateSyncStatus(send: SendMessage): Promise<void> {
  debug('recalculateSyncStatus: starting');
  const syncBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);
  if (!syncBaseline) {
    // No baseline yet, nothing to recalculate
    debug('recalculateSyncStatus: no syncBaseline, returning early');
    return;
  }

  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];
  const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];

  debug('recalculateSyncStatus: excludedCollections=', excludedCollections);
  debug('recalculateSyncStatus: excludedStyleTypes=', excludedStyleTypes);

  // Collect current state with new exclusions (this is what WILL be synced)
  const currentTokens = await collectVariables({ excludedCollections });
  const currentStyles = await collectStyles({ excludedStyleTypes });
  const currentBaseline = buildBaseline(currentTokens, currentStyles);

  debug('recalculateSyncStatus: currentBaseline entries=', Object.keys(currentBaseline.baseline).length);
  debug('recalculateSyncStatus: currentBaseline styles=', currentBaseline.styles ? Object.keys(currentBaseline.styles).length : 0);
  debug('recalculateSyncStatus: syncBaseline entries=', Object.keys(syncBaseline.baseline).length);
  debug('recalculateSyncStatus: syncBaseline styles=', syncBaseline.styles ? Object.keys(syncBaseline.styles).length : 0);

  // Compare the FULL stored baseline against the NEW filtered state
  // This shows what changes will happen when you sync:
  // - Excluded collections will show as "deleted" (removed from sync output)
  // - Re-included collections will show as "new" (added back to sync output)
  const syncDiff = compareBaselines(syncBaseline, currentBaseline);
  const pendingChanges = countChanges(syncDiff);

  debug('recalculateSyncStatus: pendingChanges=', pendingChanges);
  debug('recalculateSyncStatus: deletedVariables=', syncDiff.deletedVariables.length);
  debug('recalculateSyncStatus: newVariables=', syncDiff.newVariables.length);

  // Determine sync status
  let syncStatus: PluginState['syncStatus'] = { state: 'not-setup' };
  if (pendingChanges > 0) {
    syncStatus = { state: 'pending-changes', pendingChanges };
  } else {
    syncStatus = { state: 'in-sync' };
  }

  if (history.length > 0) {
    const lastSync = history[0];
    syncStatus.lastSync = {
      timestamp: lastSync.timestamp,
      user: lastSync.user,
      changeCount: lastSync.changeCount,
    };
  }

  debug('recalculateSyncStatus: sending state-update with syncStatus=', syncStatus);
  send({
    type: 'state-update',
    state: {
      syncStatus,
      syncDiff,
    },
  });
}
