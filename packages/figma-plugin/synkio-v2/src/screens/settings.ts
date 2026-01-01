// =============================================================================
// Settings Screen - Tabbed Layout
// =============================================================================

import { PluginState, CollectionInfo, StyleTypeInfo, GitHubSettings, UrlSettings } from '../lib/types';
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
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout,
  ContentArea,
} from '../ui/layout/index';

// =============================================================================
// Local State
// =============================================================================

type SettingsTab = 'remote' | 'data';
type EditingSource = 'github' | 'url' | null;

let currentTab: SettingsTab = 'remote';
let editingSource: EditingSource = null;
let githubForm: Partial<GitHubSettings> = {};
let urlForm: Partial<UrlSettings> = {};
let connectionStatus: { tested: boolean; success?: boolean; error?: string } = { tested: false };

export function resetSettingsScreen() {
  currentTab = 'remote';
  editingSource = null;
  githubForm = {};
  urlForm = {};
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
    title: 'Settings',
    showBack: true,
    onBack: () => {
      resetSettingsScreen();
      actions.navigate('home');
    },
  });

  // Tab control
  const tabs = SegmentedControl({
    options: [
      { value: 'remote', label: 'Remote' },
      { value: 'data', label: 'Data' },
    ],
    value: currentTab,
    onChange: (value) => {
      currentTab = value as SettingsTab;
      actions.updateState({}); // Trigger re-render
    },
  });

  const tabWrapper = el('div', { class: 'px-lg pt-md' });
  tabWrapper.appendChild(tabs);

  // Tab content
  let tabContent: HTMLElement;
  switch (currentTab) {
    case 'remote':
      tabContent = buildSourceTab(settings.remote, actions);
      break;
    case 'data':
      tabContent = buildDataTab(collections, styleTypes, settings, actions);
      break;
  }

  const content = ContentArea([tabContent]);

  return PageLayout([header, tabWrapper, content]);
}

// =============================================================================
// Data Tab
// =============================================================================

function buildDataTab(
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
// Source Tab - Card-based selection
// =============================================================================

function buildSourceTab(
  remote: PluginState['settings']['remote'],
  actions: RouterActions
): HTMLElement {
  const container = el('div', { class: 'flex flex-col gap-md' });

  // Initialize local state from settings on first render
  if (Object.keys(githubForm).length === 0 && remote.github) {
    githubForm = { ...remote.github };
  }
  if (Object.keys(urlForm).length === 0 && remote.url) {
    urlForm = { ...remote.url };
  }
  // Migrate from deprecated customUrl
  if (!urlForm.baselineUrl && remote.customUrl) {
    urlForm.baselineUrl = remote.customUrl;
  }

  // Header
  container.appendChild(el('div', { class: 'font-medium' }, 'REMOTE SOURCE'));
  container.appendChild(el('div', { class: 'text-xs text-secondary -mt-xs' }, 'Connect to fetch & sync tokens'));

  // Determine active source
  const activeSource = remote.source;
  const isGitHubActive = activeSource === 'github';
  const isUrlActive = activeSource === 'url';

  // GitHub Card
  container.appendChild(buildSourceCard({
    type: 'github',
    title: 'GitHub',
    icon: 'github',
    isActive: isGitHubActive,
    isEditing: editingSource === 'github',
    features: [
      'Fetch code changes',
      'Create PRs',
      'Sync status',
    ],
    summary: isGitHubActive && remote.github?.owner && remote.github?.repo
      ? `${remote.github.owner}/${remote.github.repo} · ${remote.github.branch || 'main'}`
      : undefined,
    onSelect: () => {
      editingSource = 'github';
      actions.updateState({});
    },
    onEdit: () => {
      editingSource = 'github';
      actions.updateState({});
    },
    onCancel: () => {
      editingSource = null;
      actions.updateState({});
    },
    onDisconnect: () => {
      editingSource = null;
      githubForm = {};
      actions.send({
        type: 'save-settings',
        settings: { enabled: false, source: 'none' },
      });
    },
    remote,
    actions,
  }));

  // URL Card
  container.appendChild(buildSourceCard({
    type: 'url',
    title: 'Custom URL',
    icon: 'link',
    isActive: isUrlActive,
    isEditing: editingSource === 'url',
    features: [
      'Fetch code changes',
      'Sync status',
    ],
    limitation: 'No PR creation',
    summary: isUrlActive && remote.url?.exportUrl
      ? truncateUrl(remote.url.exportUrl)
      : undefined,
    onSelect: () => {
      editingSource = 'url';
      actions.updateState({});
    },
    onEdit: () => {
      editingSource = 'url';
      actions.updateState({});
    },
    onCancel: () => {
      editingSource = null;
      actions.updateState({});
    },
    onDisconnect: () => {
      editingSource = null;
      urlForm = {};
      actions.send({
        type: 'save-settings',
        settings: { enabled: false, source: 'none' },
      });
    },
    remote,
    actions,
  }));

  // Auto-check option (only show if a source is configured)
  if (isGitHubActive || isUrlActive) {
    container.appendChild(Checkbox({
      label: 'Auto-check for updates',
      sublabel: 'Check remote source when plugin opens',
      checked: remote.autoCheck,
      onChange: (checked) => {
        actions.send({
          type: 'save-settings',
          settings: { autoCheck: checked },
        });
      },
    }));
  }

  return container;
}

function truncateUrl(url: string, maxLength = 35): string {
  if (url.length <= maxLength) return url;
  // Remove protocol
  let short = url.replace(/^https?:\/\//, '');
  if (short.length <= maxLength) return short;
  return short.slice(0, maxLength - 3) + '...';
}

interface SourceCardProps {
  type: 'github' | 'url';
  title: string;
  icon: string;
  isActive: boolean;
  isEditing: boolean;
  features: string[];
  limitation?: string;
  summary?: string;
  onSelect: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
  remote: PluginState['settings']['remote'];
  actions: RouterActions;
}

function buildSourceCard(props: SourceCardProps): HTMLElement {
  const { type, title, icon, isActive, isEditing, features, limitation, summary, onSelect, onEdit, onCancel, onDisconnect, remote, actions } = props;

  const cardClass = isActive ? 'source-card active' : 'source-card';

  const card = el('div', { class: cardClass });

  // Card header row
  const headerRow = el('div', { class: 'source-card-header' });

  // Left side: radio + icon + title
  const leftSide = el('div', { class: 'flex items-center gap-sm' });

  // Radio indicator
  const radio = el('div', { class: isActive ? 'source-radio active' : 'source-radio' });
  leftSide.appendChild(radio);

  // Icon
  leftSide.appendChild(Icon(icon as any, 'md'));

  // Title
  leftSide.appendChild(el('span', { class: 'font-medium' }, title));

  headerRow.appendChild(leftSide);

  // Right side: status badge or edit button
  const rightSide = el('div', { class: 'flex items-center gap-sm' });

  if (isActive && summary && !isEditing) {
    rightSide.appendChild(el('span', { class: 'source-badge' }, 'Active'));
  }

  headerRow.appendChild(rightSide);

  card.appendChild(headerRow);

  // Show summary when active and not editing
  if (isActive && summary && !isEditing) {
    const summaryRow = el('div', { class: 'source-summary' });
    summaryRow.appendChild(el('span', { class: 'text-sm text-secondary' }, summary));

    const editBtn = el('button', { class: 'source-edit-btn' }, 'Edit');
    editBtn.onclick = (e) => {
      e.stopPropagation();
      onEdit();
    };
    summaryRow.appendChild(editBtn);

    card.appendChild(summaryRow);
  }

  // Show features when not active or when editing
  if (!isActive || isEditing || !summary) {
    const featureList = el('div', { class: 'source-features' });

    for (const feature of features) {
      const featureItem = el('div', { class: 'source-feature' });
      featureItem.appendChild(el('span', { class: 'source-feature-check' }, '✓'));
      featureItem.appendChild(el('span', { class: 'text-xs' }, feature));
      featureList.appendChild(featureItem);
    }

    if (limitation) {
      const limitItem = el('div', { class: 'source-feature limitation' });
      limitItem.appendChild(el('span', { class: 'source-feature-x' }, '✗'));
      limitItem.appendChild(el('span', { class: 'text-xs text-tertiary' }, limitation));
      featureList.appendChild(limitItem);
    }

    card.appendChild(featureList);
  }

  // Show form when editing
  if (isEditing) {
    if (type === 'github') {
      card.appendChild(buildGitHubForm(remote, actions, onCancel, isActive ? onDisconnect : undefined));
    } else {
      card.appendChild(buildUrlForm(actions, onCancel, isActive ? onDisconnect : undefined));
    }
  }

  // Make card clickable when not active and not editing
  if (!isActive && !isEditing) {
    card.style.cursor = 'pointer';
    card.onclick = onSelect;
  }

  return card;
}

// =============================================================================
// GitHub Form (inline in card)
// =============================================================================

function buildGitHubForm(
  remote: PluginState['settings']['remote'],
  actions: RouterActions,
  onCancel: () => void,
  onDisconnect?: () => void
): HTMLElement {
  const container = el('div', { class: 'source-form' });

  // Repository input
  container.appendChild(Input({
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
  container.appendChild(Input({
    label: 'Branch',
    placeholder: 'main',
    value: githubForm.branch || remote.github?.branch || 'main',
    onChange: (value) => {
      githubForm.branch = value.trim() || 'main';
    },
  }));

  // Path input (for fetching export-baseline.json)
  container.appendChild(Input({
    label: 'Code → Figma path',
    placeholder: 'synkio/export-baseline.json',
    value: githubForm.path || remote.github?.path || 'synkio/export-baseline.json',
    onChange: (value) => {
      githubForm.path = value.trim() || 'synkio/export-baseline.json';
    },
  }));

  // PR Path input (for creating PRs with baseline.json)
  container.appendChild(Input({
    label: 'Figma → Code path',
    placeholder: 'synkio/baseline.json',
    value: githubForm.prPath || remote.github?.prPath || 'synkio/baseline.json',
    onChange: (value) => {
      githubForm.prPath = value.trim() || 'synkio/baseline.json';
    },
  }));

  // Token input
  container.appendChild(Input({
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
    class: 'text-xs link',
  }, 'Create token on GitHub ↗');
  container.appendChild(tokenLink);

  // Connection status
  if (connectionStatus.tested) {
    const statusEl = el('div', { class: 'mt-sm' });

    if (connectionStatus.success === true) {
      statusEl.appendChild(StatusIndicator({ type: 'success', label: 'Connected' }));
    } else if (connectionStatus.success === false) {
      statusEl.appendChild(StatusIndicator({ type: 'error', label: connectionStatus.error || 'Connection failed' }));
    }

    container.appendChild(statusEl);
  }

  // Action buttons
  const buttonRow = el('div', { class: 'source-form-buttons' });

  if (onDisconnect) {
    const disconnectBtn = Button({
      label: 'Disconnect',
      variant: 'danger',
      size: 'sm',
      onClick: onDisconnect,
    });
    buttonRow.appendChild(disconnectBtn);
  }

  const cancelBtn = Button({
    label: 'Cancel',
    variant: 'secondary',
    size: 'sm',
    onClick: onCancel,
  });
  buttonRow.appendChild(cancelBtn);

  const testBtn = Button({
    label: 'Test',
    variant: 'secondary',
    size: 'sm',
    onClick: () => {
      saveGitHubSettings(actions);
      connectionStatus = { tested: true };
      actions.send({ type: 'test-connection' });
    },
  });
  buttonRow.appendChild(testBtn);

  const saveBtn = Button({
    label: 'Save',
    variant: 'primary',
    size: 'sm',
    onClick: () => {
      saveGitHubSettings(actions);
      editingSource = null;
      actions.updateState({});
    },
  });
  buttonRow.appendChild(saveBtn);

  container.appendChild(buttonRow);

  return container;
}

// =============================================================================
// URL Form (inline in card)
// =============================================================================

function buildUrlForm(
  actions: RouterActions,
  onCancel: () => void,
  onDisconnect?: () => void
): HTMLElement {
  const container = el('div', { class: 'source-form' });

  // Export URL (Code → Figma)
  container.appendChild(Input({
    label: 'Code → Figma URL',
    placeholder: 'https://example.com/synkio/export-baseline.json',
    value: urlForm.exportUrl || '',
    onChange: (value) => {
      urlForm.exportUrl = value.trim();
    },
  }));

  container.appendChild(el('div', { class: 'text-xs text-tertiary -mt-xs mb-sm' },
    'URL to export-baseline.json'
  ));

  // Baseline URL (Figma → Code sync check)
  container.appendChild(Input({
    label: 'Figma → Code URL',
    placeholder: 'https://example.com/synkio/baseline.json',
    value: urlForm.baselineUrl || '',
    onChange: (value) => {
      urlForm.baselineUrl = value.trim();
    },
  }));

  container.appendChild(el('div', { class: 'text-xs text-tertiary -mt-xs mb-sm' },
    'URL to baseline.json for sync status'
  ));

  // Action buttons
  const buttonRow = el('div', { class: 'source-form-buttons' });

  if (onDisconnect) {
    const disconnectBtn = Button({
      label: 'Disconnect',
      variant: 'danger',
      size: 'sm',
      onClick: onDisconnect,
    });
    buttonRow.appendChild(disconnectBtn);
  }

  const cancelBtn = Button({
    label: 'Cancel',
    variant: 'secondary',
    size: 'sm',
    onClick: onCancel,
  });
  buttonRow.appendChild(cancelBtn);

  const saveBtn = Button({
    label: 'Save',
    variant: 'primary',
    size: 'sm',
    onClick: () => {
      saveUrlSettings(actions);
      editingSource = null;
      actions.updateState({});
    },
  });
  buttonRow.appendChild(saveBtn);

  container.appendChild(buttonRow);

  return container;
}

// =============================================================================
// Save Settings
// =============================================================================

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
        path: githubForm.path || 'synkio/export-baseline.json',
        prPath: githubForm.prPath || 'synkio/baseline.json',
        token: githubForm.token,
      },
    },
  });
}

function saveUrlSettings(actions: RouterActions) {
  actions.send({
    type: 'save-settings',
    settings: {
      enabled: true,
      source: 'url',
      url: {
        exportUrl: urlForm.exportUrl || '',
        baselineUrl: urlForm.baselineUrl || '',
      },
    },
  });
}

// =============================================================================
// Export for message handler
// =============================================================================

export function updateConnectionStatus(success: boolean, error?: string) {
  connectionStatus = { tested: true, success, error };
}
