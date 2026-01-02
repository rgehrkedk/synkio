// =============================================================================
// Setup Tab - Remote source configuration (GitHub/URL)
// =============================================================================

import { PluginState, GitHubSettings, UrlSettings } from '../../lib/types';
import { RouterActions } from '../../ui/router';
import {
  el,
  Button,
  Checkbox,
  Input,
  StatusIndicator,
  CommandBox,
} from '../../ui/components/index';
import { Icon } from '../../ui/icons';
import { ContentArea, Footer } from '../../ui/layout/index';
import { TabContent } from './SyncTab';
import { setMainTab } from '../main';

// =============================================================================
// Local State
// =============================================================================

type EditingSource = 'github' | 'url' | null;

let editingSource: EditingSource = null;
let githubForm: Partial<GitHubSettings> = {};
let urlForm: Partial<UrlSettings> = {};
let connectionStatus: { tested: boolean; success?: boolean; error?: string } = { tested: false };

export function resetSetupTab() {
  editingSource = null;
  githubForm = {};
  urlForm = {};
  connectionStatus = { tested: false };
}

export function updateSetupConnectionStatus(success: boolean, error?: string) {
  connectionStatus = { tested: true, success, error };
}

// =============================================================================
// Main Export
// =============================================================================

export function SetupTab(state: PluginState, actions: RouterActions): TabContent {
  const { isFirstTime, onboardingStep, settings } = state;
  const isOnboarding = isFirstTime && onboardingStep === 3;
  const remote = settings.remote;

  // Initialize form with current settings
  if (Object.keys(githubForm).length === 0 && remote.github) {
    githubForm = { ...remote.github };
  }
  if (Object.keys(urlForm).length === 0 && remote.url) {
    urlForm = { ...remote.url };
  }

  const contentChildren: HTMLElement[] = [];

  // Header text
  if (isOnboarding) {
    contentChildren.push(el('div', { class: 'font-medium' }, 'CONNECT TO CODE (optional)'));
    contentChildren.push(el('div', { class: 'text-xs text-secondary -mt-xs mb-md' }, 'Skip if using CLI only'));
  } else {
    contentChildren.push(el('div', { class: 'font-medium' }, 'CONNECT TO CODE'));
    contentChildren.push(el('div', { class: 'text-xs text-secondary -mt-xs mb-md' }, 'Connect to fetch & sync tokens'));
  }

  // Determine active source
  const activeSource = remote.source;
  const isGitHubActive = activeSource === 'github';
  const isUrlActive = activeSource === 'url';

  // GitHub Card
  contentChildren.push(buildSourceCard({
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
  contentChildren.push(buildSourceCard({
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
    contentChildren.push(Checkbox({
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

  // CLI init command box - only show during onboarding
  if (isOnboarding) {
    const initBox = el('div', { class: 'mt-md' });
    initBox.appendChild(CommandBox({
      command: 'npx synkio init',
      label: 'Next step: Initialize your project',
      description: 'Run this command in your project folder to connect Synkio and start generating token files. This is required regardless of setup option above.',
    }));
    contentChildren.push(initBox);
  }

  const content = ContentArea(contentChildren);

  // Footer
  const footer = Footer([
    Button({
      label: isOnboarding ? 'START SYNCING' : 'SAVE',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        if (isOnboarding) {
          // Complete onboarding and go back to sync tab
          actions.send({ type: 'complete-onboarding' });
          setMainTab('sync');
          actions.updateState({ isFirstTime: false, onboardingStep: undefined });
        }
      },
    }),
  ]);

  return { content, footer };
}

// =============================================================================
// Source Card
// =============================================================================

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
  leftSide.appendChild(Icon(icon as 'github' | 'link', 'md'));

  // Title
  leftSide.appendChild(el('span', { class: 'font-medium' }, title));

  headerRow.appendChild(leftSide);

  // Right side: status badge
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
      featureItem.appendChild(el('span', { class: 'source-feature-check' }, '\u2713'));
      featureItem.appendChild(el('span', { class: 'text-xs' }, feature));
      featureList.appendChild(featureItem);
    }

    if (limitation) {
      const limitItem = el('div', { class: 'source-feature limitation' });
      limitItem.appendChild(el('span', { class: 'source-feature-x' }, '\u2717'));
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
// GitHub Form
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
    label: 'Code \u2192 Figma path',
    placeholder: 'synkio/export-baseline.json',
    value: githubForm.path || remote.github?.path || 'synkio/export-baseline.json',
    onChange: (value) => {
      githubForm.path = value.trim() || 'synkio/export-baseline.json';
    },
  }));

  // PR Path input (for creating PRs with baseline.json)
  container.appendChild(Input({
    label: 'Figma \u2192 Code path',
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
  }, 'Create token on GitHub \u2197');
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
    buttonRow.appendChild(Button({
      label: 'Disconnect',
      variant: 'danger',
      size: 'sm',
      onClick: onDisconnect,
    }));
  }

  buttonRow.appendChild(Button({
    label: 'Cancel',
    variant: 'secondary',
    size: 'sm',
    onClick: onCancel,
  }));

  buttonRow.appendChild(Button({
    label: 'Test',
    variant: 'secondary',
    size: 'sm',
    onClick: () => {
      saveGitHubSettings(actions);
      connectionStatus = { tested: true };
      actions.send({ type: 'test-connection' });
    },
  }));

  buttonRow.appendChild(Button({
    label: 'Save',
    variant: 'primary',
    size: 'sm',
    onClick: () => {
      saveGitHubSettings(actions);
      editingSource = null;
      actions.updateState({});
    },
  }));

  container.appendChild(buttonRow);

  return container;
}

// =============================================================================
// URL Form
// =============================================================================

function buildUrlForm(
  actions: RouterActions,
  onCancel: () => void,
  onDisconnect?: () => void
): HTMLElement {
  const container = el('div', { class: 'source-form' });

  // Export URL (Code → Figma)
  container.appendChild(Input({
    label: 'Code \u2192 Figma URL',
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
    label: 'Figma \u2192 Code URL',
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
    buttonRow.appendChild(Button({
      label: 'Disconnect',
      variant: 'danger',
      size: 'sm',
      onClick: onDisconnect,
    }));
  }

  buttonRow.appendChild(Button({
    label: 'Cancel',
    variant: 'secondary',
    size: 'sm',
    onClick: onCancel,
  }));

  buttonRow.appendChild(Button({
    label: 'Save',
    variant: 'primary',
    size: 'sm',
    onClick: () => {
      saveUrlSettings(actions);
      editingSource = null;
      actions.updateState({});
    },
  }));

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
// Helpers
// =============================================================================

function truncateUrl(url: string, maxLength = 35): string {
  if (url.length <= maxLength) return url;
  // Remove protocol
  let short = url.replace(/^https?:\/\//, '');
  if (short.length <= maxLength) return short;
  return short.slice(0, maxLength - 3) + '...';
}
