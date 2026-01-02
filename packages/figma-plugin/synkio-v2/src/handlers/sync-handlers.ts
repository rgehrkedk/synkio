// =============================================================================
// Sync Handlers - Ready, Init, Sync operations
// =============================================================================

import {
  BaselineData,
  PluginSettings,
  PluginState,
  SyncEvent,
  StyleType,
  CodeSyncState,
} from '../lib/types';

import {
  saveChunked,
  loadChunked,
  saveSimple,
  loadSimple,
  KEYS,
  loadClientStorage,
  saveForCLI,
  generateBaselineHash,
  getFigmaBaselineHash,
  loadDebugSetting,
  saveDebugSetting,
} from '../lib/storage';

import { debug, setDebugEnabled, isDebugEnabled } from '../lib/debug';

import {
  collectVariables,
  collectStyles,
  getCollectionInfos,
  getStyleTypeInfos,
} from '../lib/collector';

import { compareBaselines, countChanges } from '../lib/compare';
import { buildBaseline } from '../operations';
import { getChangedPaths } from '../utils';
import { SendMessage } from './types';

// =============================================================================
// handleReady - Initial plugin load
// =============================================================================

export async function handleReady(send: SendMessage): Promise<void> {
  // Load debug setting first
  const debugEnabled = await loadDebugSetting();
  setDebugEnabled(debugEnabled);
  debug('Plugin ready, debug mode:', debugEnabled);

  // Load all stored data
  const syncBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);
  const codeBaseline = loadChunked<BaselineData>(KEYS.CODE_BASELINE);
  const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];
  const settings = await loadClientStorage<PluginSettings>('settings');

  // Get current collections and styles
  const collectionInfos = await getCollectionInfos();
  const collections = collectionInfos.map(c => ({
    ...c,
    excluded: excludedCollections.includes(c.name),
  }));

  const styleTypeInfos = await getStyleTypeInfos();
  const styleTypes = styleTypeInfos.map(s => ({
    ...s,
    excluded: excludedStyleTypes.includes(s.type),
  }));

  // Determine if first time (onboarding not completed)
  const onboardingComplete = loadSimple<boolean>(KEYS.ONBOARDING_COMPLETE);
  const isFirstTime = !onboardingComplete;

  // Calculate current diff if we have a baseline
  let syncDiff;
  if (syncBaseline) {
    const currentTokens = await collectVariables({ excludedCollections });
    const currentStyles = await collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(currentTokens, currentStyles);
    // Compare the FULL stored baseline against the NEW filtered state
    // This shows what changes will happen when you sync:
    // - Excluded collections will show as "deleted" (removed from sync output)
    // - Re-included collections will show as "new" (added back to sync output)
    syncDiff = compareBaselines(syncBaseline, currentBaseline);
  }

  // Get the stored baseline hash
  const figmaBaselineHash = getFigmaBaselineHash();

  // Determine sync status
  let syncStatus: PluginState['syncStatus'] = { state: 'not-setup' };
  if (syncBaseline) {
    const pendingChanges = syncDiff ? countChanges(syncDiff) : 0;
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

    // Include the baseline hash for code sync tracking
    if (figmaBaselineHash) {
      syncStatus.figmaBaselineHash = figmaBaselineHash;
    }
  }

  // Determine initial code sync state
  const hasGitHubConfig = !!(settings?.remote?.github?.owner && settings?.remote?.github?.repo);
  let codeSyncState: CodeSyncState;
  if (!syncBaseline) {
    codeSyncState = { status: 'not-connected' }; // No baseline yet
  } else if (!hasGitHubConfig) {
    codeSyncState = { status: 'not-connected' };
  } else {
    codeSyncState = { status: 'checking' }; // Will be checked when plugin loads
  }

  // Build settings object, always using fresh excluded values from storage
  const finalSettings: PluginSettings = {
    remote: settings?.remote || {
      enabled: false,
      source: 'none',
      autoCheck: false,
    },
    // Always use the fresh excluded values from document storage
    excludedCollections,
    excludedStyleTypes,
  };

  send({
    type: 'initialized',
    state: {
      syncStatus,
      codeSyncState,
      collections,
      styleTypes,
      syncBaseline: syncBaseline || undefined,
      codeBaseline: codeBaseline || undefined,
      syncDiff,
      history,
      settings: finalSettings,
      isFirstTime,
      // Start at step 1 for first-time users
      onboardingStep: isFirstTime ? 1 : undefined,
    },
  });
}

// =============================================================================
// handleInit - Re-initialize (same as ready)
// =============================================================================

export async function handleInit(send: SendMessage): Promise<void> {
  await handleReady(send);
}

// =============================================================================
// handleSync - Sync Figma state to code
// =============================================================================

export async function handleSync(send: SendMessage): Promise<void> {
  send({ type: 'sync-started' });

  try {
    // Get settings
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    // Collect current state
    const tokens = await collectVariables({ excludedCollections });
    const styles = await collectStyles({ excludedStyleTypes });

    // Build baseline
    const newBaseline = buildBaseline(tokens, styles);

    // Load old baseline for comparison
    const oldBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);

    // Compare if we have an old baseline
    let diff;
    if (oldBaseline) {
      diff = compareBaselines(oldBaseline, newBaseline);
    }

    // Generate baseline hash for code sync tracking
    const figmaBaselineHash = generateBaselineHash(
      tokens.map((t) => ({ variableId: t.variableId, path: t.path, value: t.value })),
      styles.map((s) => ({ styleId: s.styleId, path: s.path, value: s.value }))
    );

    // Save new baseline (internal format)
    saveChunked(KEYS.SYNC_BASELINE, newBaseline);

    // Also save in CLI-readable format (includes hash for tracking)
    saveForCLI({
      version: '3.1.0', // Bump version to indicate hash support
      timestamp: newBaseline.metadata.syncedAt,
      tokens: tokens,
      styles: styles,
      figmaBaselineHash,
    });

    // Update history
    const changeCount = diff ? countChanges(diff) : Object.keys(newBaseline.baseline).length;
    const user = figma.currentUser?.name || 'unknown';

    const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
    const newEvent: SyncEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      user,
      direction: 'to-code',
      changeCount,
      changes: diff ? getChangedPaths(diff) : undefined,
      action: 'cli-save',
    };

    const updatedHistory = [newEvent, ...history].slice(0, 10);
    saveSimple(KEYS.HISTORY, updatedHistory);

    send({
      type: 'sync-complete',
      baseline: newBaseline,
      diff,
    });

    // Update code sync status - we just saved new data, code needs to pull
    send({
      type: 'code-sync-update',
      codeSyncState: {
        status: 'pending-pull',
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    send({
      type: 'sync-error',
      error: String(error),
    });
  }
}

// =============================================================================
// handleCompleteOnboarding - Mark onboarding as complete
// =============================================================================

export function handleCompleteOnboarding(): void {
  saveSimple(KEYS.ONBOARDING_COMPLETE, true);
}

// =============================================================================
// handleToggleDebug - Toggle debug mode on/off
// =============================================================================

export async function handleToggleDebug(send: SendMessage): Promise<void> {
  const current = isDebugEnabled();
  const newValue = !current;
  setDebugEnabled(newValue);
  await saveDebugSetting(newValue);
  debug(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);

  // Notify UI about the change
  send({
    type: 'debug-toggled',
    enabled: newValue,
  });
}
