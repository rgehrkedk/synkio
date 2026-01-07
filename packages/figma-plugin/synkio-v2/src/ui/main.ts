// =============================================================================
// Synkio Figma Plugin - UI Entry Point
// =============================================================================

import { Screen, PluginState, MessageToUI, MessageToCode, GitHubSettings } from '../lib/types';
import { createRouter, Router, ScreenRenderer, ScreenCleanup } from './router';
import { injectStyles } from './styles/index';
import { countChanges } from '../lib/compare';
import { setRouterRef, testPath } from './api';
import {
  MainScreen,
  SyncScreen,
  ApplyScreen,
  HistoryScreen,
  resetMainScreen,
  resetApplyScreen,
  updateSetupConnectionStatus,
} from '../screens';

// =============================================================================
// Initial State
// =============================================================================

const initialState: PluginState = {
  screen: 'main',
  isLoading: true,
  loadingMessage: 'Initializing...',

  syncStatus: {
    state: 'not-setup',
  },

  codeSyncState: {
    status: 'not-connected',
  },

  collections: [],
  styleTypes: [],
  history: [],

  settings: {
    remote: {
      enabled: false,
      source: 'none',
      autoCheck: false,
    },
    excludedCollections: [],
    excludedStyleTypes: [],
  },

  isFirstTime: true,
  onboardingStep: 1,  // Start at step 1 for first-time users

  // Setup form state (prevents race conditions from module-level variables)
  setupFormState: {
    editingSource: null,
    githubForm: {},
    urlForm: {},
    connectionStatus: { tested: false },
  },
};

// =============================================================================
// Screen Registry
// =============================================================================

const screens: Record<Screen, ScreenRenderer> = {
  main: MainScreen,
  sync: SyncScreen,
  apply: ApplyScreen,
  history: HistoryScreen,
};

// =============================================================================
// App Initialization
// =============================================================================

let router: Router;

function init() {
  // Inject base and component styles
  injectStyles();

  // Get the app container
  const app = document.getElementById('app');
  if (!app) {
    console.error('Could not find #app element');
    return;
  }

  // Screen cleanup registry - called when navigating away from a screen
  const screenCleanup: Partial<Record<Screen, ScreenCleanup>> = {
    main: resetMainScreen,
    apply: resetApplyScreen,
  };

  // Create router
  router = createRouter(app, screens, initialState, sendMessage, screenCleanup);

  // Set router reference for API functions
  setRouterRef(router);

  // Initial render
  router.render();

  // Listen for messages from plugin code
  window.onmessage = handleMessage;

  // Keyboard shortcut: Ctrl+Shift+D to toggle debug mode
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      sendMessage({ type: 'toggle-debug' });
    }
  });

  // Tell the plugin we're ready
  sendMessage({ type: 'ready' });
}

// =============================================================================
// Message Handling
// =============================================================================

function sendMessage(message: MessageToCode) {
  parent.postMessage({ pluginMessage: message }, '*');
}

function handleMessage(event: MessageEvent) {
  const message = event.data.pluginMessage as MessageToUI;
  if (!message || !message.type) return;

  console.log('UI received:', message.type);

  switch (message.type) {
    case 'initialized':
      handleInitialized(message.state);
      break;

    case 'state-update':
      console.log('state-update received, syncStatus=', message.state.syncStatus);
      router.updateState(message.state);
      console.log('state-update applied, new state syncStatus=', router.getState().syncStatus);
      break;

    case 'sync-started':
      router.updateState({ isLoading: true, loadingMessage: 'Syncing...' });
      break;

    case 'sync-complete':
      handleSyncComplete(message.baseline, message.diff, message.variableIdLookup);
      break;

    case 'sync-error':
      router.updateState({
        isLoading: false,
        error: message.error,
      });
      break;

    case 'collections-update':
      // Update both collections and settings.excludedCollections to keep them in sync
      const excludedCollectionNames = message.collections
        .filter(c => c.excluded)
        .map(c => c.name);
      router.updateState({
        collections: message.collections,
        settings: {
          ...router.getState().settings,
          excludedCollections: excludedCollectionNames,
        },
      });
      break;

    case 'style-types-update':
      // Update both styleTypes and settings.excludedStyleTypes to keep them in sync
      const excludedStyleTypeNames = message.styleTypes
        .filter(s => s.excluded)
        .map(s => s.type);
      router.updateState({
        styleTypes: message.styleTypes,
        settings: {
          ...router.getState().settings,
          excludedStyleTypes: excludedStyleTypeNames,
        },
      });
      break;

    case 'fetch-started':
      router.updateState({ isLoading: true, loadingMessage: 'Fetching from repository...' });
      break;

    case 'do-fetch-remote':
      handleDoFetchRemote(message.github);
      break;

    case 'do-fetch-remote-url':
      handleDoFetchRemoteUrl(message.url);
      break;

    case 'fetch-complete':
      router.updateState({
        isLoading: false,
        codeBaseline: message.baseline,
        codeDiff: message.diff,
        variableIdLookup: message.variableIdLookup,
      });
      break;

    case 'fetch-error':
      router.updateState({
        isLoading: false,
        error: message.error,
      });
      break;

    case 'import-complete':
      router.updateState({
        isLoading: false,
        codeBaseline: message.baseline,
        codeDiff: message.diff,
        variableIdLookup: message.variableIdLookup,
      });
      break;

    case 'import-error':
      router.updateState({
        isLoading: false,
        error: message.error,
      });
      break;

    case 'apply-started':
      router.updateState({ isLoading: true, loadingMessage: 'Applying to Figma...' });
      break;

    case 'apply-complete':
      router.updateState({
        isLoading: false,
        // Clear code diff after apply
        codeDiff: undefined,
      });
      // Navigate back to main
      router.navigate('main');
      break;

    case 'apply-error':
      router.updateState({
        isLoading: false,
        error: message.error,
      });
      break;

    case 'history-update':
      router.updateState({ history: message.history });
      break;

    case 'settings-update':
      router.updateState({ settings: message.settings });
      break;

    case 'connection-test-result':
      updateSetupConnectionStatus(router, message.success, message.error);
      break;

    case 'do-test-connection':
      handleDoTestConnection(message.github);
      break;

    case 'do-test-path':
      testPath(message.github, message.path, message.testType);
      break;

    case 'data-cleared':
      resetMainScreen(); // Reset UI state before closing
      alert('All plugin data has been cleared. Please close and reopen the plugin.');
      sendMessage({ type: 'close' });
      break;

    case 'do-create-pr':
      handleCreatePR(message.github, message.files, message.prTitle, message.prBody);
      break;

    case 'pr-created':
      router.updateState({
        isLoading: false,
      });
      alert(`Pull request created successfully!\n\nPR #${message.prNumber}\n${message.prUrl}\n\nClick OK to open in browser.`);
      window.open(message.prUrl, '_blank');
      break;

    case 'pr-error':
      router.updateState({
        isLoading: false,
        error: message.error,
      });
      break;

    case 'do-check-code-sync':
      handleDoCheckCodeSync(message.github, message.baselinePath);
      break;

    case 'do-check-code-sync-url':
      handleDoCheckCodeSyncUrl(message.url);
      break;

    case 'code-sync-update':
      router.updateState({ codeSyncState: message.codeSyncState });
      break;

    case 'debug-toggled':
      console.log(`Debug mode ${message.enabled ? 'enabled' : 'disabled'}`);
      // Could show a toast notification here
      break;
  }
}

function handleInitialized(state: Partial<PluginState>) {
  // Always start on main screen - tab-based UI handles first-time vs returning
  router.updateState({
    ...state,
    screen: 'main',
    isLoading: false,
    loadingMessage: undefined,
  });

  // If remote source is configured and we have a baseline, trigger code sync check
  const remote = state.settings?.remote;
  const hasRemoteSource = remote?.enabled && (
    (remote.source === 'github' && remote.github?.owner && remote.github?.repo) ||
    (remote.source === 'url' && remote.url?.baselineUrl) ||
    (remote.source === 'local')
  );
  const hasBaseline = state.syncStatus?.state !== 'not-setup';
  if (hasRemoteSource && hasBaseline && !state.isFirstTime) {
    // Trigger code sync check
    sendMessage({ type: 'check-code-sync' });
  }
}

function handleSyncComplete(
  baseline: PluginState['syncBaseline'],
  diff?: PluginState['syncDiff'],
  variableIdLookup?: Record<string, string>
) {
  const currentState = router.getState();

  // Count changes for history record
  const changeCount = diff ? countChanges(diff) : 0;

  // Add to history
  const newEvent = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    user: 'you', // Will be replaced by actual user from plugin
    direction: 'to-code' as const,
    changeCount,
  };

  const newHistory = [newEvent, ...currentState.history].slice(0, 10);

  // After sync completes, Figma state IS the baseline - no pending changes
  router.updateState({
    isLoading: false,
    syncBaseline: baseline,
    syncDiff: undefined, // Clear diff - we just synced, no pending changes
    variableIdLookup: variableIdLookup,
    syncStatus: {
      state: 'in-sync', // After sync, always in-sync
      lastSync: {
        timestamp: Date.now(),
        user: 'you',
        changeCount,
      },
      pendingChanges: 0,
      lastAction: {
        type: 'cli-save',
        timestamp: Date.now(),
      },
    },
    history: newHistory,
    isFirstTime: false,
  });

  // Navigate to sync screen to show results
  router.navigate('sync');
}


// =============================================================================
// GitHub Fetch (UI has access to fetch API, plugin sandbox does not)
// =============================================================================

async function handleDoFetchRemote(github: GitHubSettings) {
  router.updateState({ isLoading: true, loadingMessage: 'Fetching from repository...' });

  try {
    const { owner, repo, branch, path, token } = github;

    // Build URL - use raw.githubusercontent for public repos, API for private
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    let content: string;
    const responseText = await response.text();

    // Try to parse as JSON to check if it's a GitHub API response (with base64 content)
    // or direct JSON content (from raw.githubusercontent.com)
    try {
      const parsed = JSON.parse(responseText);

      if (parsed.content && parsed.encoding === 'base64') {
        // GitHub API response - decode base64
        const base64Clean = parsed.content.replace(/\n/g, '');
        content = atob(base64Clean);
      } else if (parsed.baseline) {
        // Direct JSON content (the file itself, already parsed)
        content = responseText;
      } else {
        // Unknown JSON format
        throw new Error(`Unexpected response format: ${responseText.slice(0, 200)}`);
      }
    } catch (e) {
      // Not JSON - use as-is (raw text content)
      content = responseText;
    }

    // Send content back to plugin for processing
    sendMessage({ type: 'fetch-remote-result', content });
  } catch (error) {
    sendMessage({ type: 'fetch-remote-error', error: String(error) });
  }
}

// =============================================================================
// Test Connection (UI has fetch access, plugin sandbox does not)
// Tests repository access only - doesn't require specific files to exist
// =============================================================================

async function handleDoTestConnection(github: GitHubSettings) {
  try {
    const { owner, repo, branch, token } = github;

    // Test repository access using GitHub API (works for both public and private repos)
    // We check if the branch exists, which validates: repo access + branch + token permissions
    const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch || 'main'}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (response.ok) {
      sendMessage({ type: 'test-connection-result', success: true });
    } else {
      let errorMsg = `HTTP ${response.status}`;
      if (response.status === 404) {
        // Could be repo not found OR branch not found OR private repo without token
        if (token) {
          errorMsg = `Repository or branch not found: ${owner}/${repo} (${branch || 'main'})`;
        } else {
          errorMsg = `Repository not found or private. Add a token for private repos.`;
        }
      } else if (response.status === 401) {
        errorMsg = 'Invalid or expired token';
      } else if (response.status === 403) {
        errorMsg = 'Access forbidden - check token permissions';
      }
      sendMessage({ type: 'test-connection-result', success: false, error: errorMsg });
    }
  } catch (error) {
    sendMessage({ type: 'test-connection-result', success: false, error: String(error) });
  }
}

// =============================================================================
// =============================================================================
// URL Fetch (for custom URL source)
// =============================================================================

async function handleDoFetchRemoteUrl(url: string) {
  router.updateState({ isLoading: true, loadingMessage: 'Fetching from URL...' });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found at URL');
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const content = await response.text();

    // Validate it's valid JSON with baseline structure
    try {
      const parsed = JSON.parse(content);
      if (!parsed.baseline) {
        throw new Error('Invalid baseline format: missing baseline field');
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Invalid JSON response');
      }
      throw e;
    }

    // Send content back to plugin for processing
    sendMessage({ type: 'fetch-remote-result', content });
  } catch (error) {
    sendMessage({ type: 'fetch-remote-error', error: String(error) });
  }
}

// =============================================================================
// Code Sync Status Check (UI has access to fetch API, plugin sandbox does not)
// =============================================================================

async function handleDoCheckCodeSync(github: GitHubSettings, baselinePath: string) {
  // Update state to show checking
  router.updateState({
    codeSyncState: { status: 'checking' },
  });

  try {
    const { owner, repo, branch, token } = github;
    const targetBranch = branch || 'main';

    // Build URL - use raw.githubusercontent for public repos, API for private
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${baselinePath}?ref=${targetBranch}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${baselinePath}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        sendMessage({ type: 'code-sync-error', error: 'File not found (404)' });
        return;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    let content: string;
    const responseText = await response.text();

    // Try to parse as JSON to check if it's a GitHub API response (with base64 content)
    try {
      const parsed = JSON.parse(responseText);

      if (parsed.content && parsed.encoding === 'base64') {
        // GitHub API response - decode base64
        const base64Clean = parsed.content.replace(/\n/g, '');
        content = atob(base64Clean);
      } else if (parsed.baseline || parsed.metadata) {
        // Direct JSON content (the file itself, already parsed)
        content = responseText;
      } else {
        throw new Error(`Unexpected response format`);
      }
    } catch {
      // Not JSON - use as-is
      content = responseText;
    }

    // Send content back to plugin for processing
    sendMessage({ type: 'code-sync-result', content });
  } catch (error) {
    sendMessage({ type: 'code-sync-error', error: String(error) });
  }
}

// =============================================================================
// Code Sync Status Check via Custom URL
// =============================================================================

async function handleDoCheckCodeSyncUrl(url: string) {
  // Update state to show checking
  router.updateState({
    codeSyncState: { status: 'checking' },
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        sendMessage({ type: 'code-sync-error', error: 'baseline.json not found at URL' });
        return;
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const content = await response.text();

    // Validate it's valid JSON with baseline structure
    try {
      const parsed = JSON.parse(content);
      if (!parsed.baseline && !parsed.metadata) {
        throw new Error('Invalid baseline.json format');
      }
    } catch {
      throw new Error('Invalid JSON response');
    }

    // Send content back to plugin for processing
    sendMessage({ type: 'code-sync-result', content });
  } catch (error) {
    sendMessage({ type: 'code-sync-error', error: String(error) });
  }
}

// =============================================================================
// GitHub PR Creation (UI has access to fetch API, plugin sandbox does not)
// =============================================================================

async function handleCreatePR(
  github: GitHubSettings,
  files: Record<string, string>,
  prTitle: string,
  prBody: string
) {
  router.updateState({ isLoading: true, loadingMessage: 'Creating pull request...' });

  try {
    const { owner, repo, branch, token } = github;
    const baseBranch = branch || 'main';

    // 1. Get base branch SHA
    const baseSha = await getBaseBranchSha(owner, repo, baseBranch, token);

    // 2. Create new branch
    const prBranch = `synkio/sync-${Date.now()}`;
    await createBranch(owner, repo, prBranch, baseSha, token);

    // 3. Commit files using Git Tree API (atomic multi-file commit)
    await commitFiles(owner, repo, prBranch, files, 'chore: Sync design tokens from Figma', token);

    // 4. Create PR
    const pr = await createPullRequest(
      owner,
      repo,
      {
        title: prTitle,
        body: prBody,
        head: prBranch,
        base: baseBranch,
      },
      token
    );

    // 5. Send success back to plugin
    sendMessage({
      type: 'pr-created-result',
      prUrl: pr.html_url,
      prNumber: pr.number,
    });
  } catch (error) {
    sendMessage({
      type: 'pr-created-error',
      error: String(error),
    });
  }
}

// =============================================================================
// GitHub API Helpers
// =============================================================================

interface GitHubApiError {
  message?: string;
  documentation_url?: string;
}

/**
 * Fetch with response.ok check. Throws user-friendly error on failure.
 */
async function checkedFetch(
  url: string,
  options: RequestInit,
  context: string
): Promise<Response> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `${context}: HTTP ${response.status}`;

    try {
      const errorData: GitHubApiError = await response.json();
      if (errorData.message) {
        errorMessage = `${context}: ${errorData.message}`;
      }
    } catch {
      // Response body wasn't JSON, use status text
      if (response.statusText) {
        errorMessage = `${context}: ${response.statusText}`;
      }
    }

    throw new Error(errorMessage);
  }

  return response;
}

/**
 * Fetch JSON with response.ok check. Throws user-friendly error on failure.
 */
async function checkedFetchJson<T>(
  url: string,
  options: RequestInit,
  context: string
): Promise<T> {
  const response = await checkedFetch(url, options, context);
  return response.json() as Promise<T>;
}

async function getBaseBranchSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const data = await checkedFetchJson<{ object: { sha: string } }>(
    url,
    { headers },
    'Failed to get base branch'
  );
  return data.object.sha;
}

async function createBranch(
  owner: string,
  repo: string,
  branch: string,
  sha: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  await checkedFetch(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha,
      }),
    },
    'Failed to create branch'
  );
}

async function commitFiles(
  owner: string,
  repo: string,
  branch: string,
  files: Record<string, string>,
  message: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  // 1. Get current commit SHA
  const refData = await checkedFetchJson<{ object: { sha: string } }>(
    `${baseUrl}/git/ref/heads/${branch}`,
    { headers },
    'Failed to get branch reference'
  );
  const currentCommitSha = refData.object.sha;

  // 2. Get current commit tree
  const commitData = await checkedFetchJson<{ tree: { sha: string } }>(
    `${baseUrl}/git/commits/${currentCommitSha}`,
    { headers },
    'Failed to get commit details'
  );
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const tree: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  for (const [path, content] of Object.entries(files)) {
    const blobData = await checkedFetchJson<{ sha: string }>(
      `${baseUrl}/git/blobs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          encoding: 'utf-8',
        }),
      },
      `Failed to create blob for ${path}`
    );

    tree.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 4. Create tree
  const treeData = await checkedFetchJson<{ sha: string }>(
    `${baseUrl}/git/trees`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    },
    'Failed to create Git tree'
  );

  // 5. Create commit
  const newCommitData = await checkedFetchJson<{ sha: string }>(
    `${baseUrl}/git/commits`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [currentCommitSha],
      }),
    },
    'Failed to create commit'
  );

  // 6. Update branch ref
  await checkedFetch(
    `${baseUrl}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitData.sha,
      }),
    },
    'Failed to update branch reference'
  );
}

async function createPullRequest(
  owner: string,
  repo: string,
  pr: { title: string; body: string; head: string; base: string },
  token?: string
): Promise<{ html_url: string; number: number }> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  return checkedFetchJson<{ html_url: string; number: number }>(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(pr),
    },
    'Failed to create pull request'
  );
}

// =============================================================================
// Start
// =============================================================================

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
