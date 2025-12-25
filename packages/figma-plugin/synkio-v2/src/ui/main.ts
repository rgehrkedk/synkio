// =============================================================================
// Synkio Figma Plugin - UI Entry Point
// =============================================================================

import { Screen, PluginState, MessageToUI, MessageToCode } from '../lib/types';
import { createRouter, Router, ScreenRenderer } from './router';
import { injectStyles } from './components';
import {
  HomeScreen,
  SyncScreen,
  ApplyScreen,
  HistoryScreen,
  SettingsScreen,
  OnboardingScreen,
  updateConnectionStatus,
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
  // Inject component styles
  injectStyles();

  // Inject additional app styles
  injectAppStyles();

  // Get the app container
  const app = document.getElementById('app');
  if (!app) {
    console.error('Could not find #app element');
    return;
  }

  // Create router
  router = createRouter(app, screens, initialState, sendMessage);

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
      router.updateState(message.state);
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
      router.updateState({ collections: message.collections });
      break;

    case 'style-types-update':
      router.updateState({ styleTypes: message.styleTypes });
      break;

    case 'fetch-started':
      router.updateState({ isLoading: true, loadingMessage: 'Fetching from repository...' });
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
// App Styles
// =============================================================================

function injectAppStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Page transitions */
    .page {
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--color-border-strong);
    }

    /* Selection */
    ::selection {
      background: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }

    /* Focus styles */
    :focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }
  `;
  document.head.appendChild(style);
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
