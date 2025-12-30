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
// Start
// =============================================================================

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
