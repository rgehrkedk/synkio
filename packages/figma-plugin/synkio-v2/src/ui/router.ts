// =============================================================================
// Simple Router for Figma Plugin UI
// =============================================================================

import { Screen, PluginState } from '../lib/types';
import { clear } from './components/index';

export type ScreenRenderer = (state: PluginState, actions: RouterActions) => HTMLElement;
export type ScreenCleanup = () => void;

export interface RouterActions {
  navigate: (screen: Screen) => void;
  send: (message: any) => void;
  updateState: (partial: Partial<PluginState>) => void;
}

export interface Router {
  navigate: (screen: Screen) => void;
  render: () => void;
  updateState: (partial: Partial<PluginState>) => void;
  getState: () => PluginState;
}

export function createRouter(
  container: HTMLElement,
  screens: Record<Screen, ScreenRenderer>,
  initialState: PluginState,
  sendMessage: (message: any) => void,
  screenCleanup?: Partial<Record<Screen, ScreenCleanup>>
): Router {
  let state = initialState;

  const actions: RouterActions = {
    navigate: (screen: Screen) => {
      // Call cleanup for current screen before switching
      if (screenCleanup) {
        const cleanup = screenCleanup[state.screen];
        if (cleanup) cleanup();
      }

      state = { ...state, screen };
      render();
    },
    send: sendMessage,
    updateState: (partial: Partial<PluginState>) => {
      state = { ...state, ...partial };
      render();
    },
  };

  function render() {
    const screenRenderer = screens[state.screen];
    if (!screenRenderer) {
      console.error(`Unknown screen: ${state.screen}`);
      return;
    }

    clear(container);
    const screenEl = screenRenderer(state, actions);
    container.appendChild(screenEl);
  }

  return {
    navigate: actions.navigate,
    render,
    updateState: actions.updateState,
    getState: () => state,
  };
}
