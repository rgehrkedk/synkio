// =============================================================================
// Setup Tab - Remote source configuration (GitHub/URL)
// =============================================================================

import { PluginState, GitHubSettings, UrlSettings, SetupFormState, PathTestResult } from '../../lib/types';
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
import { testPath } from '../../ui/api';

// =============================================================================
// Default Form State
// =============================================================================

const defaultFormState: SetupFormState = {
  editingSource: null,
  githubForm: {},
  urlForm: {},
  connectionStatus: { tested: false },
};

/**
 * Get the current form state from plugin state, with defaults.
 */
function getFormState(state: PluginState): SetupFormState {
  return state.setupFormState || defaultFormState;
}

/**
 * Update the setup form state.
 */
function updateFormState(actions: RouterActions, state: PluginState, updates: Partial<SetupFormState>) {
  const currentFormState = getFormState(state);
  actions.updateState({
    setupFormState: { ...currentFormState, ...updates },
  });
}

/**
 * Get the default form state (for resetting).
 */
export function getDefaultSetupFormState(): SetupFormState {
  return { ...defaultFormState };
}

/**
 * Reset the setup tab form state (for external use when navigating away).
 * Note: This is a no-op now since state is managed via PluginState.setupFormState.
 * Kept for backwards compatibility - callers should transition to using
 * actions.updateState({ setupFormState: getDefaultSetupFormState() }) if needed.
 */
export function resetSetupTab() {
  // State is now managed via PluginState.setupFormState
  // No module-level state to reset anymore
}

/**
 * Update connection status (called from ui/main.ts when connection-test-result is received).
 */
export function updateSetupConnectionStatus(
  router: { getState: () => PluginState; updateState: (state: Partial<PluginState>) => void },
  success: boolean,
  error?: string
) {
  const currentFormState = getFormState(router.getState());
  router.updateState({
    setupFormState: {
      ...currentFormState,
      connectionStatus: { tested: true, success, error },
    },
  });
}

// =============================================================================
// Main Export
// =============================================================================

export function SetupTab(state: PluginState, actions: RouterActions): TabContent {
  const { isFirstTime, onboardingStep, settings } = state;
  const isOnboarding = isFirstTime && onboardingStep === 3;
  const remote = settings.remote;

  // Get current form state from plugin state
  const formState = getFormState(state);
  const { editingSource, githubForm, urlForm, connectionStatus } = formState;

  // Initialize form with current settings if empty
  if (Object.keys(githubForm).length === 0 && remote.github) {
    // Use a microtask to avoid mutating during render
    queueMicrotask(() => {
      updateFormState(actions, state, { githubForm: { ...remote.github } });
    });
  }
  if (Object.keys(urlForm).length === 0 && remote.url) {
    queueMicrotask(() => {
      updateFormState(actions, state, { urlForm: { ...remote.url } });
    });
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
      updateFormState(actions, state, { editingSource: 'github' });
    },
    onEdit: () => {
      updateFormState(actions, state, { editingSource: 'github' });
    },
    onCancel: () => {
      updateFormState(actions, state, { editingSource: null });
    },
    onDisconnect: () => {
      updateFormState(actions, state, { editingSource: null, githubForm: {} });
      actions.send({
        type: 'save-settings',
        settings: { enabled: false, source: 'none' },
      });
    },
    remote,
    actions,
    state,
    formState,
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
      updateFormState(actions, state, { editingSource: 'url' });
    },
    onEdit: () => {
      updateFormState(actions, state, { editingSource: 'url' });
    },
    onCancel: () => {
      updateFormState(actions, state, { editingSource: null });
    },
    onDisconnect: () => {
      updateFormState(actions, state, { editingSource: null, urlForm: {} });
      actions.send({
        type: 'save-settings',
        settings: { enabled: false, source: 'none' },
      });
    },
    remote,
    actions,
    state,
    formState,
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
  state: PluginState;
  formState: SetupFormState;
}

function buildSourceCard(props: SourceCardProps): HTMLElement {
  const { type, title, icon, isActive, isEditing, features, limitation, summary, onSelect, onEdit, onCancel, onDisconnect, remote, actions, state, formState } = props;

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
      card.appendChild(buildGitHubForm(remote, actions, state, formState, onCancel, isActive ? onDisconnect : undefined));
    } else {
      card.appendChild(buildUrlForm(actions, state, formState, onCancel, isActive ? onDisconnect : undefined));
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
// Helper: Input with Test Button
// =============================================================================

function InputWithTest(props: {
  label: string;
  placeholder: string;
  value: string;
  testResult?: PathTestResult;
  onBlur: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
}): HTMLElement {
  const { label, placeholder, value, testResult, onBlur, onChange, onTest } = props;

  const container = el('div', { class: 'input-with-test-container' });
  const row = el('div', { class: 'input-with-test' });

  // Input wrapper (takes most of the space)
  const inputWrapper = el('div', { class: 'input-with-test__input' });
  inputWrapper.appendChild(Input({
    label,
    placeholder,
    value,
    onBlur,
    onChange,
  }));
  row.appendChild(inputWrapper);

  // Test button
  const testBtn = el('button', {
    class: 'input-with-test__btn',
    type: 'button',
    title: 'Test',
  });

  // Show status icon or "Test" text
  if (testResult?.tested) {
    if (testResult.success) {
      testBtn.innerHTML = '\u2713'; // checkmark
      testBtn.classList.add('input-with-test__btn--success');
    } else if (testResult.warning) {
      testBtn.innerHTML = '!'; // warning
      testBtn.classList.add('input-with-test__btn--warning');
    } else {
      testBtn.innerHTML = '\u2717'; // x
      testBtn.classList.add('input-with-test__btn--error');
    }
  } else {
    testBtn.textContent = 'Test';
  }

  testBtn.onclick = onTest;
  row.appendChild(testBtn);
  container.appendChild(row);

  // Show message below input if there's an error or warning
  if (testResult?.tested && !testResult.success && testResult.error) {
    const msgClass = testResult.warning ? 'input-with-test__msg--warning' : 'input-with-test__msg--error';
    const msg = el('div', { class: `input-with-test__msg ${msgClass}` }, testResult.error);
    container.appendChild(msg);
  }

  return container;
}

// =============================================================================
// GitHub Form
// =============================================================================

function buildGitHubForm(
  remote: PluginState['settings']['remote'],
  actions: RouterActions,
  state: PluginState,
  formState: SetupFormState,
  onCancel: () => void,
  onDisconnect?: () => void
): HTMLElement {
  const { githubForm, pathTests } = formState;
  const container = el('div', { class: 'source-form' });

  // Repository + Branch row with test button
  const repoDisplayValue = githubForm.owner && githubForm.repo
    ? `${githubForm.owner}/${githubForm.repo}`
    : (githubForm.owner || '');

  container.appendChild(InputWithTest({
    label: 'Repository',
    placeholder: 'owner/repo',
    value: repoDisplayValue,
    testResult: pathTests?.repo,
    onBlur: true,
    onChange: (value) => {
      const parts = value.split('/');
      const newGithubForm = {
        ...githubForm,
        owner: parts[0]?.trim() || '',
        repo: parts.length >= 2 ? (parts[1]?.trim() || '') : '',
      };
      updateFormState(actions, state, { githubForm: newGithubForm, pathTests: { ...pathTests, repo: undefined } });
    },
    onTest: () => {
      saveGitHubSettings(actions, formState);
      testPath(buildGitHubSettingsFromForm(formState), '', 'repo');
    },
  }));

  // Branch input (no test button - tested with repo)
  container.appendChild(Input({
    label: 'Branch',
    placeholder: 'main',
    value: githubForm.branch || remote.github?.branch || 'main',
    onBlur: true,
    onChange: (value) => {
      const newGithubForm = { ...githubForm, branch: value.trim() || 'main' };
      updateFormState(actions, state, { githubForm: newGithubForm, pathTests: { ...pathTests, repo: undefined } });
    },
  }));

  // Code → Figma path with test
  container.appendChild(InputWithTest({
    label: 'Code \u2192 Figma path',
    placeholder: 'e.g. synkio/export-baseline.json',
    value: 'path' in githubForm ? (githubForm.path || '') : (remote.github?.path || ''),
    testResult: pathTests?.exportPath,
    onBlur: true,
    onChange: (value) => {
      const newGithubForm = { ...githubForm, path: value.trim() };
      updateFormState(actions, state, { githubForm: newGithubForm, pathTests: { ...pathTests, exportPath: undefined } });
    },
    onTest: () => {
      saveGitHubSettings(actions, formState);
      const path = githubForm.path || '';
      if (!path) return; // Don't test empty path
      testPath(buildGitHubSettingsFromForm(formState), path, 'exportPath');
    },
  }));

  // Figma → Code path with test
  container.appendChild(InputWithTest({
    label: 'Figma \u2192 Code path',
    placeholder: 'e.g. synkio/baseline.json',
    value: 'prPath' in githubForm ? (githubForm.prPath || '') : (remote.github?.prPath || ''),
    testResult: pathTests?.prPath,
    onBlur: true,
    onChange: (value) => {
      const newGithubForm = { ...githubForm, prPath: value.trim() };
      updateFormState(actions, state, { githubForm: newGithubForm, pathTests: { ...pathTests, prPath: undefined } });
    },
    onTest: () => {
      saveGitHubSettings(actions, formState);
      const path = githubForm.prPath || '';
      if (!path) return; // Don't test empty path
      testPath(buildGitHubSettingsFromForm(formState), path, 'prPath');
    },
  }));

  // Token input
  container.appendChild(Input({
    label: 'Token (private repos)',
    placeholder: 'ghp_xxxxx...',
    type: 'password',
    value: githubForm.token || '',
    onBlur: true,
    onChange: (value) => {
      const newGithubForm = { ...githubForm, token: value.trim() };
      // Clear all path tests when token changes
      updateFormState(actions, state, { githubForm: newGithubForm, pathTests: undefined });
    },
  }));

  // Token help link
  const tokenLink = el('a', {
    href: 'https://github.com/settings/tokens/new?scopes=repo&description=Synkio%20Figma%20Plugin',
    target: '_blank',
    class: 'text-xs link',
  }, 'Create token on GitHub \u2197');
  container.appendChild(tokenLink);

  // Show path test errors
  const pathErrors: string[] = [];
  if (pathTests?.repo?.tested && !pathTests.repo.success && pathTests.repo.error) {
    pathErrors.push(`Repository: ${pathTests.repo.error}`);
  }
  if (pathTests?.exportPath?.tested && !pathTests.exportPath.success && pathTests.exportPath.error) {
    // 404 for export path is ok - show as info not error
    if (!pathTests.exportPath.error.includes('will be created')) {
      pathErrors.push(`Export path: ${pathTests.exportPath.error}`);
    }
  }
  if (pathTests?.prPath?.tested && !pathTests.prPath.success && pathTests.prPath.error) {
    if (!pathTests.prPath.error.includes('will be created')) {
      pathErrors.push(`PR path: ${pathTests.prPath.error}`);
    }
  }

  if (pathErrors.length > 0) {
    const errorEl = el('div', { class: 'mt-sm' });
    errorEl.appendChild(StatusIndicator({ type: 'error', label: pathErrors.join('; ') }));
    container.appendChild(errorEl);
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
    label: 'Save',
    variant: 'primary',
    size: 'sm',
    onClick: () => {
      saveGitHubSettings(actions, formState);
      updateFormState(actions, state, { editingSource: null });
    },
  }));

  container.appendChild(buttonRow);

  return container;
}

// Helper to build GitHubSettings from form state
function buildGitHubSettingsFromForm(formState: SetupFormState): GitHubSettings {
  const { githubForm } = formState;
  return {
    owner: githubForm.owner || '',
    repo: githubForm.repo || '',
    branch: githubForm.branch || 'main',
    path: githubForm.path || '',
    prPath: githubForm.prPath || '',
    token: githubForm.token,
  };
}

// =============================================================================
// URL Form
// =============================================================================

function buildUrlForm(
  actions: RouterActions,
  state: PluginState,
  formState: SetupFormState,
  onCancel: () => void,
  onDisconnect?: () => void
): HTMLElement {
  const { urlForm } = formState;
  const container = el('div', { class: 'source-form' });

  // Export URL (Code → Figma)
  container.appendChild(Input({
    label: 'Code \u2192 Figma URL',
    placeholder: 'https://example.com/synkio/export-baseline.json',
    value: urlForm.exportUrl || '',
    onBlur: true,
    onChange: (value) => {
      const newUrlForm = { ...urlForm, exportUrl: value.trim() };
      updateFormState(actions, state, { urlForm: newUrlForm });
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
    onBlur: true,
    onChange: (value) => {
      const newUrlForm = { ...urlForm, baselineUrl: value.trim() };
      updateFormState(actions, state, { urlForm: newUrlForm });
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
      saveUrlSettings(actions, formState);
      updateFormState(actions, state, { editingSource: null });
    },
  }));

  container.appendChild(buttonRow);

  return container;
}

// =============================================================================
// Save Settings
// =============================================================================

function saveGitHubSettings(actions: RouterActions, formState: SetupFormState) {
  const { githubForm } = formState;
  actions.send({
    type: 'save-settings',
    settings: {
      enabled: true,
      source: 'github',
      github: {
        owner: githubForm.owner || '',
        repo: githubForm.repo || '',
        branch: githubForm.branch || 'main',
        path: githubForm.path || '',
        prPath: githubForm.prPath || '',
        token: githubForm.token,
      },
    },
  });
}

function saveUrlSettings(actions: RouterActions, formState: SetupFormState) {
  const { urlForm } = formState;
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
