// =============================================================================
// Remote Handlers - Fetch remote baseline, test connection
// =============================================================================

import {
  BaselineData,
  PluginSettings,
  StyleType,
  CodeSyncState,
} from '../lib/types';

import {
  saveChunked,
  loadChunked,
  loadSimple,
  KEYS,
  loadClientStorage,
  saveClientStorage,
  getFigmaBaselineHash,
} from '../lib/storage';

import {
  collectVariables,
  collectStyles,
} from '../lib/collector';

import { compareBaselines } from '../lib/compare';
import { debug, isDebugEnabled } from '../lib/debug';
import { buildBaseline } from '../operations';
import { SendMessage } from './types';

// =============================================================================
// handleFetchRemote - Initiate fetch from GitHub or URL
// =============================================================================

export async function handleFetchRemote(send: SendMessage): Promise<void> {
  // Network requests must be made from the UI (iframe) because the plugin sandbox
  // doesn't have access to fetch. We send the request info to the UI.
  try {
    const settings = await loadClientStorage<PluginSettings>('settings');
    const remote = settings?.remote;

    if (!remote?.enabled || remote.source === 'none') {
      throw new Error('Remote source not configured. Please configure in Settings.');
    }

    // Handle URL source
    if (remote.source === 'url') {
      const exportUrl = remote.url?.exportUrl;
      if (!exportUrl) {
        throw new Error('Export URL not configured. Please configure in Settings.');
      }

      send({
        type: 'do-fetch-remote-url',
        url: exportUrl,
      });
      return;
    }

    // Handle GitHub source
    if (!remote.github) {
      throw new Error('GitHub not configured. Please configure in Settings.');
    }

    const { owner, repo, branch, path, token } = remote.github;

    if (!owner || !repo) {
      throw new Error('Repository not configured');
    }

    // Send fetch request to UI (which has access to fetch API)
    send({
      type: 'do-fetch-remote',
      github: { owner, repo, branch: branch || 'main', path: path || 'synkio/export-baseline.json', token },
    });
  } catch (error) {
    send({
      type: 'fetch-error',
      error: String(error),
    });
  }
}

// =============================================================================
// handleFetchRemoteResult - Process fetched baseline content
// =============================================================================

export async function handleFetchRemoteResult(
  content: string,
  send: SendMessage
): Promise<void> {
  try {
    // Parse and validate
    const codeBaseline = JSON.parse(content) as BaselineData;

    if (!codeBaseline.baseline) {
      throw new Error('Invalid baseline format: missing baseline field');
    }

    // Save code baseline
    saveChunked(KEYS.CODE_BASELINE, codeBaseline);

    // Update settings with last fetch time
    const settings = await loadClientStorage<PluginSettings>('settings');
    if (settings) {
      settings.remote.lastFetch = new Date().toISOString();
      await saveClientStorage('settings', settings);
    }

    // Compare with current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const tokens = await collectVariables({ excludedCollections });
    const styles = await collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(tokens, styles);

    // === DEBUG LOGGING ===
    if (isDebugEnabled()) {
      const codeEntries = Object.values(codeBaseline.baseline);
      const figmaEntries = Object.values(currentBaseline.baseline);

      debug('=== COMPARISON DEBUG ===');
      debug('Code baseline entries:', codeEntries.length);
      debug('Figma baseline entries:', figmaEntries.length);

      // Count entries with/without variableId
      const codeWithId = codeEntries.filter(e => e.variableId).length;
      const codeWithoutId = codeEntries.filter(e => !e.variableId).length;
      const figmaWithId = figmaEntries.filter(e => e.variableId).length;
      const figmaWithoutId = figmaEntries.filter(e => !e.variableId).length;

      debug('Code - with variableId:', codeWithId, ', without:', codeWithoutId);
      debug('Figma - with variableId:', figmaWithId, ', without:', figmaWithoutId);

      // Sample entries
      debug('Sample code entries (first 3):');
      codeEntries.slice(0, 3).forEach((e, i) => {
        debug(`  [${i}] path=${e.path}, collection=${e.collection}, mode=${e.mode}, variableId=${e.variableId || 'NONE'}`);
      });

      debug('Sample figma entries (first 3):');
      figmaEntries.slice(0, 3).forEach((e, i) => {
        debug(`  [${i}] path=${e.path}, collection=${e.collection}, mode=${e.mode}, variableId=${e.variableId || 'NONE'}`);
      });

      // Look for bg.primary specifically
      const codeBgPrimary = codeEntries.filter(e => e.path.startsWith('bg.primary.'));
      const figmaBgPrimary = figmaEntries.filter(e => e.path.startsWith('bg.primary.'));
      debug('bg.primary.* in code:', codeBgPrimary.length);
      codeBgPrimary.forEach(e => debug(`  code: ${e.path} (${e.mode}) variableId=${e.variableId || 'NONE'}`));
      debug('bg.primary.* in figma:', figmaBgPrimary.length);
      figmaBgPrimary.forEach(e => debug(`  figma: ${e.path} (${e.mode}) variableId=${e.variableId || 'NONE'}`));
    }
    // === END DEBUG ===

    // Compare baselines using ID-based matching
    // Since export-baseline.json now has the same structure as baseline.json
    // (with separate styles section, proper type mapping, stripped prefixes),
    // we can use the standard compareBaselines function
    const diff = compareBaselines(currentBaseline, codeBaseline);

    // === DEBUG DIFF RESULTS ===
    if (isDebugEnabled()) {
      debug('=== DIFF RESULTS ===');
      debug('valueChanges:', diff.valueChanges.length);
      debug('pathChanges:', diff.pathChanges.length);
      debug('newVariables:', diff.newVariables.length);
      debug('deletedVariables:', diff.deletedVariables.length);
      debug('newModes:', diff.newModes.length);
      debug('deletedModes:', diff.deletedModes.length);
      debug('styleValueChanges:', diff.styleValueChanges.length);
      debug('stylePathChanges:', diff.stylePathChanges.length);
      debug('newStyles:', diff.newStyles.length);
      debug('deletedStyles:', diff.deletedStyles.length);

      if (diff.pathChanges.length > 0) {
        debug('Path changes (renames):');
        diff.pathChanges.slice(0, 10).forEach(c => debug(`  ${c.oldPath} -> ${c.newPath} (${c.mode})`));
      }

      if (diff.newVariables.length > 0) {
        debug('New variables (first 10):');
        diff.newVariables.slice(0, 10).forEach(v => debug(`  + ${v.path} (${v.collection}.${v.mode}) variableId=${v.variableId || 'NONE'}`));
      }

      if (diff.deletedVariables.length > 0) {
        debug('Deleted variables (first 10):');
        diff.deletedVariables.slice(0, 10).forEach(v => debug(`  - ${v.path} (${v.collection}.${v.mode}) variableId=${v.variableId || 'NONE'}`));
      }

      if (diff.valueChanges.length > 0) {
        debug('Value changes (first 10):');
        diff.valueChanges.slice(0, 10).forEach(v => {
          debug(`  ${v.path} (${v.collection}.${v.mode}): ${JSON.stringify(v.oldValue).slice(0, 50)} -> ${JSON.stringify(v.newValue).slice(0, 50)}`);
        });
      }

      if (diff.deletedModes.length > 0) {
        debug('Deleted modes:');
        diff.deletedModes.forEach(m => debug(`  ${m.collection}: ${m.mode}`));
      }

      if (diff.deletedStyles.length > 0) {
        debug('Deleted styles (first 10):');
        diff.deletedStyles.slice(0, 10).forEach(s => debug(`  - ${s.path} (${s.styleType})`));
      }
      debug('=== END DEBUG ===');
    }

    send({
      type: 'fetch-complete',
      baseline: codeBaseline,
      diff,
    });
  } catch (error) {
    send({
      type: 'fetch-error',
      error: String(error),
    });
  }
}

// =============================================================================
// handleFetchRemoteError - Handle fetch error from UI
// =============================================================================

export function handleFetchRemoteError(error: string, send: SendMessage): void {
  send({ type: 'fetch-error', error });
}

// =============================================================================
// handleTestConnection - Test GitHub connection
// =============================================================================

export async function handleTestConnection(send: SendMessage): Promise<void> {
  try {
    const settings = await loadClientStorage<PluginSettings>('settings');
    if (!settings?.remote.github) {
      send({
        type: 'connection-test-result',
        success: false,
        error: 'GitHub not configured',
      });
      return;
    }

    const { owner, repo, branch, path, token } = settings.remote.github;
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${path}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers, method: 'HEAD' });

    if (response.ok) {
      send({
        type: 'connection-test-result',
        success: true,
      });
    } else {
      send({
        type: 'connection-test-result',
        success: false,
        error: `HTTP ${response.status}`,
      });
    }
  } catch (error) {
    send({
      type: 'connection-test-result',
      success: false,
      error: String(error),
    });
  }
}

// =============================================================================
// handleCheckCodeSync - Check if code has pulled the latest baseline
// =============================================================================

export async function handleCheckCodeSync(send: SendMessage): Promise<void> {
  try {
    const settings = await loadClientStorage<PluginSettings>('settings');
    const remote = settings?.remote;

    // Check if any remote is configured
    if (!remote?.enabled || remote.source === 'none') {
      send({
        type: 'code-sync-update',
        codeSyncState: { status: 'not-connected' },
      });
      return;
    }

    // Handle custom URL source
    if (remote.source === 'url') {
      const baselineUrl = remote.url?.baselineUrl || remote.customUrl; // Support deprecated customUrl
      if (!baselineUrl) {
        send({
          type: 'code-sync-update',
          codeSyncState: { status: 'not-connected' },
        });
        return;
      }
      send({
        type: 'do-check-code-sync-url',
        url: baselineUrl,
      });
      return;
    }

    // Handle GitHub source
    const github = remote.github;
    if (!github?.owner || !github?.repo) {
      send({
        type: 'code-sync-update',
        codeSyncState: { status: 'not-connected' },
      });
      return;
    }

    // Get the baseline path (prPath for baseline.json, defaults to synkio/baseline.json)
    const baselinePath = github.prPath || 'synkio/baseline.json';

    // Send request to UI to fetch the baseline.json from GitHub
    send({
      type: 'do-check-code-sync',
      github: {
        owner: github.owner,
        repo: github.repo,
        branch: github.branch || 'main',
        path: baselinePath,
        token: github.token,
      },
      baselinePath,
    });
  } catch (error) {
    send({
      type: 'code-sync-update',
      codeSyncState: {
        status: 'not-connected',
        error: String(error),
      },
    });
  }
}

// =============================================================================
// handleCodeSyncResult - Process the fetched baseline.json content
// =============================================================================

export async function handleCodeSyncResult(
  content: string,
  send: SendMessage
): Promise<void> {
  try {
    // Parse the baseline.json from GitHub
    const codeBaseline = JSON.parse(content) as BaselineData;

    // Get the hash from the code baseline
    const codeBaselineHash = codeBaseline.metadata?.figmaBaselineHash;

    // Get the stored Figma baseline hash
    const figmaBaselineHash = getFigmaBaselineHash();

    // Debug logging for hash comparison
    if (isDebugEnabled()) {
      debug('=== CODE SYNC CHECK ===');
      debug('Hash from GitHub baseline.json:', codeBaselineHash || 'NOT FOUND');
      debug('Hash stored in Figma plugin:', figmaBaselineHash || 'NOT FOUND');
      debug('Hashes match:', codeBaselineHash === figmaBaselineHash);
    }

    // Always log this for troubleshooting
    console.log('[Synkio] Code sync check - GitHub hash:', codeBaselineHash, 'Plugin hash:', figmaBaselineHash);

    // Determine status
    let codeSyncState: CodeSyncState;

    if (!figmaBaselineHash) {
      // No hash stored in plugin - first sync or old plugin version
      codeSyncState = {
        status: 'not-connected',
        lastChecked: new Date().toISOString(),
      };
    } else if (!codeBaselineHash) {
      // Code baseline doesn't have hash - old CLI version or manual baseline
      codeSyncState = {
        status: 'pending-pull',
        lastChecked: new Date().toISOString(),
        codeBaselineHash: undefined,
      };
    } else if (codeBaselineHash === figmaBaselineHash) {
      // Hashes match - code is up to date
      codeSyncState = {
        status: 'synced',
        lastChecked: new Date().toISOString(),
        codeBaselineHash,
      };
    } else {
      // Hashes don't match - code needs to pull
      codeSyncState = {
        status: 'pending-pull',
        lastChecked: new Date().toISOString(),
        codeBaselineHash,
      };
    }

    send({
      type: 'code-sync-update',
      codeSyncState,
    });
  } catch (error) {
    send({
      type: 'code-sync-update',
      codeSyncState: {
        status: 'not-connected',
        lastChecked: new Date().toISOString(),
        error: String(error),
      },
    });
  }
}

// =============================================================================
// handleCodeSyncError - Handle fetch error from UI
// =============================================================================

export function handleCodeSyncError(error: string, send: SendMessage): void {
  // Check if it's a 404 - baseline.json doesn't exist yet in the repository
  if (error.includes('404') || error.includes('Not Found') || error.includes('not found')) {
    send({
      type: 'code-sync-update',
      codeSyncState: {
        status: 'pending-pull',
        lastChecked: new Date().toISOString(),
        error: 'baseline.json not found - commit and push after running synkio pull',
      },
    });
  } else {
    send({
      type: 'code-sync-update',
      codeSyncState: {
        status: 'not-connected',
        lastChecked: new Date().toISOString(),
        error,
      },
    });
  }
}
