// =============================================================================
// Settings Screen
// =============================================================================

import { PluginState, CollectionInfo, StyleTypeInfo, GitHubSettings } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Card,
  Section,
  Button,
  Checkbox,
  Input,
  Alert,
  StatusIndicator,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createColumn,
  createRow,
} from '../ui/router';

// Local state for form inputs
let githubForm: Partial<GitHubSettings> = {};
let connectionStatus: { tested: boolean; success?: boolean; error?: string } = { tested: false };

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
      // Reset local state
      githubForm = {};
      connectionStatus = { tested: false };
      actions.navigate('home');
    },
  });

  let contentChildren: HTMLElement[] = [];

  // Collections Section
  contentChildren.push(buildCollectionsSection(collections, settings.excludedCollections, actions));

  // Styles Section
  contentChildren.push(buildStylesSection(styleTypes, settings.excludedStyleTypes, actions));

  // GitHub Connection Section
  contentChildren.push(buildGitHubSection(settings.remote, actions));

  // Advanced Section
  contentChildren.push(buildAdvancedSection(actions));

  const content = createContentArea(contentChildren);
  return createPageLayout([header, content]);
}

function buildCollectionsSection(
  collections: CollectionInfo[],
  excluded: string[],
  actions: RouterActions
): HTMLElement {
  const children: HTMLElement[] = [];

  if (collections.length === 0) {
    children.push(el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--spacing-sm) 0;',
    }, 'No variable collections found'));
  } else {
    for (const collection of collections) {
      const isExcluded = excluded.includes(collection.name);
      const modeNames = collection.modes.map(m => m.name).join(' \u00B7 ');

      const checkbox = Checkbox({
        label: collection.name,
        sublabel: `${modeNames} \u00B7 ${collection.variableCount} variables`,
        checked: !isExcluded,
        onChange: (checked) => {
          let newExcluded: string[];
          if (checked) {
            newExcluded = excluded.filter(n => n !== collection.name);
          } else {
            newExcluded = [...excluded, collection.name];
          }
          actions.send({ type: 'save-excluded-collections', collections: newExcluded });
        },
      });

      children.push(checkbox);
    }
  }

  return Section({
    title: 'COLLECTIONS',
    collapsible: true,
    defaultExpanded: true,
    children,
  });
}

function buildStylesSection(
  styleTypes: StyleTypeInfo[],
  excluded: string[],
  actions: RouterActions
): HTMLElement {
  const children: HTMLElement[] = [];

  const styleLabels: Record<string, string> = {
    paint: 'Paint Styles',
    text: 'Text Styles',
    effect: 'Effect Styles',
  };

  for (const styleType of styleTypes) {
    const isExcluded = excluded.includes(styleType.type);

    const checkbox = Checkbox({
      label: styleLabels[styleType.type] || styleType.type,
      sublabel: `${styleType.count} styles`,
      checked: !isExcluded,
      onChange: (checked) => {
        let newExcluded: string[];
        if (checked) {
          newExcluded = excluded.filter(t => t !== styleType.type);
        } else {
          newExcluded = [...excluded, styleType.type];
        }
        actions.send({ type: 'save-excluded-style-types', styleTypes: newExcluded as any });
      },
    });

    children.push(checkbox);
  }

  if (styleTypes.length === 0) {
    children.push(el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--spacing-sm) 0;',
    }, 'No styles found'));
  }

  return Section({
    title: 'STYLES',
    collapsible: true,
    defaultExpanded: true,
    children,
  });
}

function buildGitHubSection(remote: PluginState['settings']['remote'], actions: RouterActions): HTMLElement {
  const children: HTMLElement[] = [];

  // Repository input
  const repoInput = Input({
    label: 'Repository (owner/repo)',
    placeholder: 'acme/design-system',
    value: githubForm.owner && githubForm.repo ? `${githubForm.owner}/${githubForm.repo}` : '',
    onChange: (value) => {
      const parts = value.split('/');
      if (parts.length === 2) {
        githubForm.owner = parts[0].trim();
        githubForm.repo = parts[1].trim();
      }
    },
  });
  children.push(repoInput);

  // Branch input
  const branchInput = Input({
    label: 'Branch',
    placeholder: 'main',
    value: githubForm.branch || remote.github?.branch || 'main',
    onChange: (value) => {
      githubForm.branch = value.trim() || 'main';
    },
  });
  children.push(branchInput);

  // Path input
  const pathInput = Input({
    label: 'Path to baseline',
    placeholder: '.synkio/export-baseline.json',
    value: githubForm.path || remote.github?.path || '.synkio/export-baseline.json',
    onChange: (value) => {
      githubForm.path = value.trim() || '.synkio/export-baseline.json';
    },
  });
  children.push(pathInput);

  // Token input (for private repos)
  const tokenInput = Input({
    label: 'Access Token (optional, for private repos)',
    placeholder: 'ghp_xxxxx...',
    type: 'password',
    value: githubForm.token || '',
    onChange: (value) => {
      githubForm.token = value.trim();
    },
  });
  children.push(tokenInput);

  // Connection status and buttons
  const buttonRow = createRow([
    Button({
      label: 'Test Connection',
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        // Save first, then test
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
              token: githubForm.token,
            },
          },
        });
        connectionStatus = { tested: true };
        actions.send({ type: 'test-connection' });
      },
    }),
    Button({
      label: 'Save',
      variant: 'primary',
      size: 'sm',
      onClick: () => {
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
              token: githubForm.token,
            },
          },
        });
      },
    }),
  ], 'var(--spacing-sm)');
  children.push(buttonRow);

  // Connection status indicator
  if (connectionStatus.tested || remote.lastFetch) {
    const statusEl = el('div', { style: 'margin-top: var(--spacing-sm);' });

    if (connectionStatus.success === true) {
      statusEl.appendChild(StatusIndicator({ type: 'success', label: 'Connected' }));
    } else if (connectionStatus.success === false) {
      statusEl.appendChild(StatusIndicator({ type: 'error', label: connectionStatus.error || 'Connection failed' }));
    } else if (remote.lastFetch) {
      const date = new Date(remote.lastFetch);
      statusEl.appendChild(StatusIndicator({
        type: 'success',
        label: `Last fetched ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
      }));
    }

    children.push(statusEl);
  }

  return Section({
    title: 'GITHUB CONNECTION',
    collapsible: true,
    defaultExpanded: true,
    children,
  });
}

function buildAdvancedSection(actions: RouterActions): HTMLElement {
  const children: HTMLElement[] = [];

  // Auto-check toggle
  const autoCheckbox = Checkbox({
    label: 'Auto-check for code updates',
    sublabel: 'Check GitHub for updates when plugin opens',
    checked: false, // TODO: get from state
    onChange: (checked) => {
      actions.send({
        type: 'save-settings',
        settings: { autoCheck: checked },
      });
    },
  });
  children.push(autoCheckbox);

  // Clear data button
  const clearButton = Button({
    label: 'CLEAR ALL PLUGIN DATA',
    variant: 'danger',
    fullWidth: true,
    onClick: () => {
      if (confirm('This will remove all baselines, history, and settings. Are you sure?')) {
        // TODO: implement clear data
        alert('Data cleared. Please reload the plugin.');
      }
    },
  });
  clearButton.style.marginTop = 'var(--spacing-md)';
  children.push(clearButton);

  return Section({
    title: 'ADVANCED',
    collapsible: true,
    defaultExpanded: false,
    children,
  });
}

// Export function to update connection status from message handler
export function updateConnectionStatus(success: boolean, error?: string) {
  connectionStatus = { tested: true, success, error };
}
