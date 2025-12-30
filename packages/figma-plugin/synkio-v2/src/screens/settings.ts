// =============================================================================
// Settings Screen - Tabbed Layout
// =============================================================================

import { PluginState, CollectionInfo, StyleTypeInfo, GitHubSettings } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Card,
  Button,
  Checkbox,
  Input,
  StatusIndicator,
  SegmentedControl,
  Divider,
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout,
  ContentArea,
  Row,
} from '../ui/layout/index';

// =============================================================================
// Local State
// =============================================================================

type SettingsTab = 'sync' | 'github' | 'more';

let currentTab: SettingsTab = 'sync';
let githubForm: Partial<GitHubSettings> = {};
let connectionStatus: { tested: boolean; success?: boolean; error?: string } = { tested: false };

export function resetSettingsScreen() {
  currentTab = 'sync';
  githubForm = {};
  connectionStatus = { tested: false };
}

// =============================================================================
// Main Screen
// =============================================================================

export function SettingsScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections, styleTypes, settings } = state;

  // Initialize form with current settings
  if (Object.keys(githubForm).length === 0 && settings.remote.github) {
    githubForm = { ...settings.remote.github };
  }

  // Header
  const header = Header({
    title: 'SETTINGS',
    showBack: true,
    onBack: () => {
      resetSettingsScreen();
      actions.navigate('home');
    },
  });

  // Tab control
  const tabs = SegmentedControl({
    options: [
      { value: 'sync', label: 'Sync' },
      { value: 'github', label: 'GitHub' },
      { value: 'more', label: 'More' },
    ],
    value: currentTab,
    onChange: (value) => {
      currentTab = value;
      actions.updateState({}); // Trigger re-render
    },
  });

  const tabWrapper = el('div', { class: 'px-lg pt-md' });
  tabWrapper.appendChild(tabs);

  // Tab content
  let tabContent: HTMLElement;
  switch (currentTab) {
    case 'sync':
      tabContent = buildSyncTab(collections, styleTypes, settings, actions);
      break;
    case 'github':
      tabContent = buildGitHubTab(settings.remote, actions);
      break;
    case 'more':
      tabContent = buildMoreTab(settings.remote, actions);
      break;
  }

  const content = ContentArea([tabContent]);

  return PageLayout([header, tabWrapper, content]);
}

// =============================================================================
// Sync Tab
// =============================================================================

function buildSyncTab(
  collections: CollectionInfo[],
  styleTypes: StyleTypeInfo[],
  settings: PluginState['settings'],
  actions: RouterActions
): HTMLElement {
  const container = el('div', { class: 'flex flex-col gap-lg' });

  // Collections card
  const collectionsCard = buildCollectionsCard(collections, settings.excludedCollections, actions);
  container.appendChild(collectionsCard);

  // Styles card
  const stylesCard = buildStylesCard(styleTypes, settings.excludedStyleTypes, actions);
  container.appendChild(stylesCard);

  return container;
}

function buildCollectionsCard(
  collections: CollectionInfo[],
  excluded: string[],
  actions: RouterActions
): HTMLElement {
  const card = Card({ padding: 'md' });

  // Header with count
  const includedCount = collections.filter(c => !excluded.includes(c.name)).length;
  const headerRow = el('div', { class: 'flex items-center justify-between mb-md' });
  headerRow.appendChild(el('span', { class: 'font-medium' }, 'COLLECTIONS'));
  headerRow.appendChild(el('span', { class: 'text-xs text-secondary' }, `${includedCount} of ${collections.length}`));
  card.appendChild(headerRow);

  if (collections.length === 0) {
    card.appendChild(el('div', { class: 'text-sm text-tertiary' }, 'No variable collections found'));
  } else {
    const list = el('div', { class: 'flex flex-col gap-sm' });

    for (const collection of collections) {
      const isExcluded = excluded.includes(collection.name);
      const modeNames = collection.modes.map(m => m.name).join(' \u00B7 ');

      const checkbox = Checkbox({
        label: collection.name,
        sublabel: `${modeNames} \u00B7 ${collection.variableCount} vars`,
        checked: !isExcluded,
        onChange: (checked) => {
          const newExcluded = checked
            ? excluded.filter(n => n !== collection.name)
            : [...excluded, collection.name];
          actions.send({ type: 'save-excluded-collections', collections: newExcluded });
        },
      });

      list.appendChild(checkbox);
    }

    card.appendChild(list);
  }

  return card;
}

function buildStylesCard(
  styleTypes: StyleTypeInfo[],
  excluded: string[],
  actions: RouterActions
): HTMLElement {
  const card = Card({ padding: 'md' });

  // Header with count
  const includedCount = styleTypes.filter(s => !excluded.includes(s.type)).length;
  const headerRow = el('div', { class: 'flex items-center justify-between mb-md' });
  headerRow.appendChild(el('span', { class: 'font-medium' }, 'STYLES'));
  headerRow.appendChild(el('span', { class: 'text-xs text-secondary' }, `${includedCount} of ${styleTypes.length}`));
  card.appendChild(headerRow);

  if (styleTypes.length === 0) {
    card.appendChild(el('div', { class: 'text-sm text-tertiary' }, 'No styles found'));
  } else {
    const styleLabels: Record<string, string> = {
      paint: 'Paint Styles',
      text: 'Text Styles',
      effect: 'Effect Styles',
    };

    const list = el('div', { class: 'flex flex-col gap-sm' });

    for (const styleType of styleTypes) {
      const isExcluded = excluded.includes(styleType.type);

      const checkbox = Checkbox({
        label: styleLabels[styleType.type] || styleType.type,
        sublabel: `${styleType.count} styles`,
        checked: !isExcluded,
        onChange: (checked) => {
          const newExcluded = checked
            ? excluded.filter(t => t !== styleType.type)
            : [...excluded, styleType.type];
          actions.send({ type: 'save-excluded-style-types', styleTypes: newExcluded as any });
        },
      });

      list.appendChild(checkbox);
    }

    card.appendChild(list);
  }

  return card;
}

// =============================================================================
// GitHub Tab
// =============================================================================

function buildGitHubTab(
  remote: PluginState['settings']['remote'],
  actions: RouterActions
): HTMLElement {
  const container = el('div', { class: 'flex flex-col gap-md' });

  // Form card
  const formCard = Card({ padding: 'md' });

  // Repository input
  formCard.appendChild(Input({
    label: 'Repository',
    placeholder: 'owner/repo',
    value: githubForm.owner && githubForm.repo ? `${githubForm.owner}/${githubForm.repo}` : '',
    onChange: (value) => {
      const parts = value.split('/');
      if (parts.length === 2) {
        githubForm.owner = parts[0].trim();
        githubForm.repo = parts[1].trim();
      }
    },
  }));

  // Branch input
  formCard.appendChild(Input({
    label: 'Branch',
    placeholder: 'main',
    value: githubForm.branch || remote.github?.branch || 'main',
    onChange: (value) => {
      githubForm.branch = value.trim() || 'main';
    },
  }));

  // Path input (for fetching export-baseline.json)
  formCard.appendChild(Input({
    label: 'Fetch Path (Code → Figma)',
    placeholder: '.synkio/export-baseline.json',
    value: githubForm.path || remote.github?.path || '.synkio/export-baseline.json',
    onChange: (value) => {
      githubForm.path = value.trim() || '.synkio/export-baseline.json';
    },
  }));

  // PR Path input (for creating PRs with baseline.json)
  formCard.appendChild(Input({
    label: 'PR Path (Figma → Code)',
    placeholder: '.synkio/baseline.json',
    value: githubForm.prPath || remote.github?.prPath || '.synkio/baseline.json',
    onChange: (value) => {
      githubForm.prPath = value.trim() || '.synkio/baseline.json';
    },
  }));

  // Token input
  formCard.appendChild(Input({
    label: 'Token (private repos)',
    placeholder: 'ghp_xxxxx...',
    type: 'password',
    value: githubForm.token || '',
    onChange: (value) => {
      githubForm.token = value.trim();
    },
  }));

  // Token help link
  const tokenLink = el('a', {
    href: 'https://github.com/settings/tokens/new?scopes=repo&description=Synkio%20Figma%20Plugin',
    target: '_blank',
    class: 'text-xs link -mt-xs',
  }, 'Create token on GitHub \u2197');
  formCard.appendChild(tokenLink);

  container.appendChild(formCard);

  // Action buttons
  const buttonRow = Row([
    Button({
      label: 'Test',
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        saveGitHubSettings(actions);
        connectionStatus = { tested: true };
        actions.send({ type: 'test-connection' });
      },
    }),
    Button({
      label: 'Save',
      variant: 'primary',
      size: 'sm',
      onClick: () => saveGitHubSettings(actions),
    }),
  ], 'var(--spacing-sm)');

  // Make buttons equal width
  const buttons = buttonRow.querySelectorAll('button');
  buttons.forEach(btn => {
    (btn as HTMLElement).style.flex = '1';
  });

  container.appendChild(buttonRow);

  // Connection status
  if (connectionStatus.tested || remote.lastFetch) {
    const statusEl = el('div', { class: 'flex justify-center' });

    if (connectionStatus.success === true) {
      statusEl.appendChild(StatusIndicator({ type: 'success', label: 'Connected' }));
    } else if (connectionStatus.success === false) {
      statusEl.appendChild(StatusIndicator({ type: 'error', label: connectionStatus.error || 'Connection failed' }));
    } else if (remote.lastFetch) {
      const date = new Date(remote.lastFetch);
      statusEl.appendChild(StatusIndicator({
        type: 'success',
        label: `Last fetch: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      }));
    }

    container.appendChild(statusEl);
  }

  return container;
}

function saveGitHubSettings(actions: RouterActions) {
  actions.send({
    type: 'save-settings',
    settings: {
      enabled: true,
      source: 'github',
      github: {
        owner: githubForm.owner || '',
        repo: githubForm.repo || '',
        branch: githubForm.branch || 'main',
        path: githubForm.path || '.synkio/export-baseline.json',
        prPath: githubForm.prPath || '.synkio/baseline.json',
        token: githubForm.token,
      },
    },
  });
}

// =============================================================================
// More Tab
// =============================================================================

function buildMoreTab(
  remote: PluginState['settings']['remote'],
  actions: RouterActions
): HTMLElement {
  const container = el('div', { class: 'flex flex-col gap-lg' });

  // Behavior card
  const behaviorCard = Card({ padding: 'md' });
  behaviorCard.appendChild(el('div', { class: 'font-medium mb-md' }, 'BEHAVIOR'));

  behaviorCard.appendChild(Checkbox({
    label: 'Auto-check for updates',
    sublabel: 'Check GitHub when plugin opens',
    checked: remote.autoCheck,
    onChange: (checked) => {
      actions.send({
        type: 'save-settings',
        settings: { autoCheck: checked },
      });
    },
  }));

  container.appendChild(behaviorCard);

  // Danger zone card
  const dangerCard = Card({ padding: 'md' });
  dangerCard.appendChild(el('div', { class: 'font-medium mb-xs text-error' }, 'DANGER ZONE'));
  dangerCard.appendChild(el('div', { class: 'text-sm text-secondary mb-md' }, 'Remove all baselines, history, and settings'));

  dangerCard.appendChild(Button({
    label: 'Clear All Data',
    variant: 'danger',
    fullWidth: true,
    onClick: () => {
      if (confirm('This will remove all plugin data. Are you sure?')) {
        actions.send({ type: 'clear-all-data' });
      }
    },
  }));

  container.appendChild(dangerCard);

  // Version info
  const versionInfo = el('div', { class: 'text-center text-xs text-tertiary pt-md' }, 'Synkio v2.0.0');
  container.appendChild(versionInfo);

  return container;
}

// =============================================================================
// Export for message handler
// =============================================================================

export function updateConnectionStatus(success: boolean, error?: string) {
  connectionStatus = { tested: true, success, error };
}
