// =============================================================================
// Simple Router for Figma Plugin UI
// =============================================================================

import { Screen, PluginState } from '../lib/types';
import { clear } from './components';

export type ScreenRenderer = (state: PluginState, actions: RouterActions) => HTMLElement;

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
  sendMessage: (message: any) => void
): Router {
  let state = initialState;

  const actions: RouterActions = {
    navigate: (screen: Screen) => {
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

// =============================================================================
// Layout Helpers
// =============================================================================

export function createPageLayout(children: HTMLElement[]): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';
  page.style.cssText = `
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  `;

  for (const child of children) {
    page.appendChild(child);
  }

  return page;
}

export function createContentArea(children: HTMLElement[]): HTMLElement {
  const content = document.createElement('div');
  content.className = 'content';
  content.style.cssText = `
    flex: 1;
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    overflow-y: auto;
  `;

  for (const child of children) {
    content.appendChild(child);
  }

  return content;
}

export function createFooter(children: HTMLElement[]): HTMLElement {
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.style.cssText = `
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  `;

  for (const child of children) {
    footer.appendChild(child);
  }

  return footer;
}

export function createRow(children: HTMLElement[], gap: string = 'var(--spacing-md)'): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    align-items: center;
    gap: ${gap};
  `;

  for (const child of children) {
    row.appendChild(child);
  }

  return row;
}

export function createColumn(children: HTMLElement[], gap: string = 'var(--spacing-md)'): HTMLElement {
  const col = document.createElement('div');
  col.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: ${gap};
  `;

  for (const child of children) {
    col.appendChild(child);
  }

  return col;
}

export function createSpacer(): HTMLElement {
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  return spacer;
}

export function createDivider(): HTMLElement {
  const divider = document.createElement('hr');
  divider.style.cssText = `
    border: none;
    border-top: 1px dashed var(--color-border);
    margin: var(--spacing-md) 0;
  `;
  return divider;
}

export function createText(content: string, style: 'title' | 'subtitle' | 'body' | 'caption' = 'body'): HTMLElement {
  const text = document.createElement('span');
  text.textContent = content;

  const styles: Record<string, string> = {
    title: `font-size: var(--font-size-xl); font-weight: 600; color: var(--color-text);`,
    subtitle: `font-size: var(--font-size-md); font-weight: 500; color: var(--color-text);`,
    body: `font-size: var(--font-size-sm); color: var(--color-text);`,
    caption: `font-size: var(--font-size-xs); color: var(--color-text-secondary);`,
  };

  text.style.cssText = styles[style];
  return text;
}
