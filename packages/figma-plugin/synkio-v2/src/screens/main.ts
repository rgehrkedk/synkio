// =============================================================================
// Main Screen - Tabbed navigation container
// =============================================================================

import { PluginState, MainTab } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  SegmentedControl,
  TabBadge,
  AppFooter,
  showDataModal,
  closeDataModal,
} from '../ui/components/index';
import { PageLayout } from '../ui/layout/index';
import { SyncTab, TokensTab, SetupTab, resetSetupTab, TabContent } from './tabs/index';

// App version
const APP_VERSION = '1.0.0';

// =============================================================================
// Local State
// =============================================================================

let currentTab: MainTab = 'sync';

export function resetMainScreen() {
  currentTab = 'sync';
  resetSetupTab();
}

export function setMainTab(tab: MainTab) {
  currentTab = tab;
}

// =============================================================================
// Main Screen
// =============================================================================

export function MainScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isFirstTime, onboardingStep } = state;

  // During onboarding, sync tab to step
  if (isFirstTime && onboardingStep) {
    const stepToTab: Record<number, MainTab> = {
      1: 'sync',
      2: 'tokens',
      3: 'setup',
    };
    currentTab = stepToTab[onboardingStep] || 'sync';
  }

  // Build header
  const header = buildHeader(isFirstTime, onboardingStep);

  // Build tab bar
  const tabBar = buildTabBar(currentTab, isFirstTime, onboardingStep, actions);

  // Build tab content
  const { content, footer } = buildTabContent(currentTab, state, actions);

  // Build app footer (only in normal mode, not during onboarding)
  const appFooter = !isFirstTime ? buildAppFooter(actions) : null;

  // Assemble page
  const children: HTMLElement[] = [header, tabBar, content];
  if (footer) {
    children.push(footer);
  }
  if (appFooter) {
    children.push(appFooter);
  }

  return PageLayout(children);
}

// =============================================================================
// Header
// =============================================================================

function buildHeader(isFirstTime: boolean, onboardingStep?: 1 | 2 | 3): HTMLElement {
  // During onboarding, show step badge
  if (isFirstTime && onboardingStep) {
    return Header({
      rightAction: TabBadge({ current: onboardingStep }),
    });
  }

  // Normal mode: just logo
  return Header({});
}

// =============================================================================
// Tab Bar
// =============================================================================

function buildTabBar(
  activeTab: MainTab,
  isFirstTime: boolean,
  onboardingStep: number | undefined,
  actions: RouterActions
): HTMLElement {
  const tabWrapper = el('div', { class: 'px-lg pt-md' });

  const tabs = SegmentedControl({
    options: [
      { value: 'sync', label: 'Sync' },
      { value: 'tokens', label: 'Tokens' },
      { value: 'setup', label: 'Setup' },
    ],
    value: activeTab,
    onChange: (value) => {
      const newTab = value as MainTab;

      // During onboarding, only allow going to completed or current step
      if (isFirstTime && onboardingStep) {
        const tabOrder: MainTab[] = ['sync', 'tokens', 'setup'];
        const currentIndex = onboardingStep - 1;
        const targetIndex = tabOrder.indexOf(newTab);

        // Can only go to tabs up to current step
        if (targetIndex > currentIndex) {
          return; // Don't allow jumping ahead
        }
      }

      currentTab = newTab;
      actions.updateState({});
    },
  });

  tabWrapper.appendChild(tabs);
  return tabWrapper;
}

// =============================================================================
// Tab Content
// =============================================================================

function buildTabContent(
  tab: MainTab,
  state: PluginState,
  actions: RouterActions
): TabContent {
  switch (tab) {
    case 'sync':
      return SyncTab(state, actions);
    case 'tokens':
      return TokensTab(state, actions);
    case 'setup':
      return SetupTab(state, actions);
    default:
      return SyncTab(state, actions);
  }
}

// =============================================================================
// App Footer
// =============================================================================

function buildAppFooter(actions: RouterActions): HTMLElement {
  return AppFooter({
    version: APP_VERSION,
    onDocsClick: () => {
      window.open('https://synkio.io/docs', '_blank');
    },
    onFeedbackClick: () => {
      window.open('https://github.com/synkio/synkio/issues', '_blank');
    },
    onSupportClick: () => {
      window.open('https://ko-fi.com/rasmusgehrke', '_blank');
    },
    onDataClick: () => {
      showDataModal({
        onClearData: () => {
          actions.send({ type: 'clear-all-data' });
        },
        onClose: () => {
          closeDataModal();
        },
      });
    },
  });
}
