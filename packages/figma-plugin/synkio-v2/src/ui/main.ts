// =============================================================================
// Synkio Figma Plugin - UI Entry Point
// =============================================================================

import { Screen, PluginState, MessageToUI, MessageToCode, GitHubSettings } from '../lib/types';
import { createRouter, Router, ScreenRenderer, ScreenCleanup } from './router';
import { injectStyles } from './styles/index';
import {
  HomeScreen,
  SyncScreen,
  ApplyScreen,
  HistoryScreen,
  SettingsScreen,
  OnboardingScreen,
  updateConnectionStatus,
  resetOnboarding,
  resetApplyScreen,
  resetSettingsScreen,
} from '../screens';

// =============================================================================
// Initial State
// =============================================================================

const initialState: PluginState = {
  screen: 'home',
  isLoading: true,
  loadingMessage: 'Initializing...',

  syncStatus: {
    state: 'not-setup',
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
};

// =============================================================================
// Screen Registry
// =============================================================================

const screens: Record<Screen, ScreenRenderer> = {
  home: HomeScreen,
  sync: SyncScreen,
  apply: ApplyScreen,
  history: HistoryScreen,
  settings: SettingsScreen,
  onboarding: OnboardingScreen,
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
    onboarding: resetOnboarding,
    apply: resetApplyScreen,
    settings: resetSettingsScreen,
  };

  // Create router
  router = createRouter(app, screens, initialState, sendMessage, screenCleanup);

  // Initial render
  router.render();

  // Listen for messages from plugin code
  window.onmessage = handleMessage;

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
      handleSyncComplete(message.baseline, message.diff);
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

    case 'fetch-complete':
      router.updateState({
        isLoading: false,
        codeBaseline: message.baseline,
        codeDiff: message.diff,
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
      // Navigate back to home
      router.navigate('home');
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
      updateConnectionStatus(message.success, message.error);
      router.updateState({}); // Trigger re-render
      break;

    case 'data-cleared':
      resetOnboarding(); // Reset UI state before closing
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
  }
}

function handleInitialized(state: Partial<PluginState>) {
  // Determine initial screen
  let screen: Screen = 'home';

  if (state.isFirstTime) {
    screen = 'onboarding';
  }

  router.updateState({
    ...state,
    screen,
    isLoading: false,
    loadingMessage: undefined,
  });
}

function handleSyncComplete(baseline: PluginState['syncBaseline'], diff?: PluginState['syncDiff']) {
  const currentState = router.getState();

  // Count changes to update pending count
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

  router.updateState({
    isLoading: false,
    syncBaseline: baseline,
    syncDiff: diff,
    syncStatus: {
      state: changeCount > 0 ? 'pending-changes' : 'in-sync',
      lastSync: {
        timestamp: Date.now(),
        user: 'you',
        changeCount,
      },
      pendingChanges: 0, // After sync, no pending changes
    },
    history: newHistory,
    isFirstTime: false,
  });

  // If we were in onboarding, stay on the onboarding complete screen
  // Otherwise navigate to sync screen
  if (currentState.screen !== 'onboarding') {
    router.navigate('sync');
  }
}

function countChanges(diff: PluginState['syncDiff']): number {
  if (!diff) return 0;
  return (
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.newVariables.length +
    diff.deletedVariables.length
  );
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
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to get base branch: ${response.statusText}`);
  }

  const data = await response.json();
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
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create branch: ${response.statusText}`);
  }
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

  // 1. Get current commit SHA
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const refResponse = await fetch(refUrl, { headers });
  const refData = await refResponse.json();
  const currentCommitSha = refData.object.sha;

  // 2. Get current commit tree
  const commitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSha}`;
  const commitResponse = await fetch(commitUrl, { headers });
  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const tree = [];
  for (const [path, content] of Object.entries(files)) {
    const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs`;
    const blobResponse = await fetch(blobUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content,
        encoding: 'utf-8',
      }),
    });
    const blobData = await blobResponse.json();

    tree.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 4. Create tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees`;
  const treeResponse = await fetch(treeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });
  const treeData = await treeResponse.json();

  // 5. Create commit
  const newCommitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
  const newCommitResponse = await fetch(newCommitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [currentCommitSha],
    }),
  });
  const newCommitData = await newCommitResponse.json();

  // 6. Update branch ref
  const updateRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  await fetch(updateRefUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitData.sha,
    }),
  });
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
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(pr),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create PR: ${errorData.message || response.statusText}`);
  }

  return response.json();
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
