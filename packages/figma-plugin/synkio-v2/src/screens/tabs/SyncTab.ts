// =============================================================================
// Sync Tab - Status overview and sync workflows
// =============================================================================

import { PluginState, SyncEvent, CodeSyncState } from '../../lib/types';
import { RouterActions } from '../../ui/router';
import {
  el,
  Card,
  Button,
  StatusIndicator,
  HeroHeader,
  WelcomeFeature,
  WelcomeLinks,
} from '../../ui/components/index';
import { Icon } from '../../ui/icons';
import { ContentArea, Row, Footer } from '../../ui/layout/index';

export interface TabContent {
  content: HTMLElement;
  footer: HTMLElement | null;
}

export function SyncTab(state: PluginState, actions: RouterActions): TabContent {
  const { isFirstTime, onboardingStep } = state;

  // First-time: Show welcome content
  if (isFirstTime && onboardingStep === 1) {
    return buildFirstTimeContent(actions);
  }

  // Normal: Show sync status and workflows
  return buildNormalContent(state, actions);
}

// =============================================================================
// First-Time Content (Welcome)
// =============================================================================

function buildFirstTimeContent(actions: RouterActions): TabContent {
  const content = ContentArea([]);

  // Hero header with logo and tagline
  content.appendChild(HeroHeader({
    title: 'SYNKIO',
    subtitle: 'Sync design tokens without Figma Enterprise.',
  }));

  // Single feature card - bi-directional sync visualization
  content.appendChild(WelcomeFeature({
    title: 'Bi-directional Sync',
    description: 'Keep your design tokens in sync between Figma and your codebase.',
  }));

  // Spacer to push footer down
  const spacer = el('div', { style: 'flex: 1;' });
  content.appendChild(spacer);

  // External links
  content.appendChild(WelcomeLinks({
    onWebsiteClick: () => {
      window.open('https://synkio.io', '_blank');
    },
    onDocsClick: () => {
      window.open('https://synkio.io/docs', '_blank');
    },
  }));

  // Footer with CTA
  const footer = Footer([
    Button({
      label: 'NEXT: SELECT TOKENS',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        // Trigger collection/style scanning
        actions.send({ type: 'get-collections' });
        actions.send({ type: 'get-style-types' });
        // Advance to step 2
        actions.updateState({ onboardingStep: 2 });
      },
    }),
  ]);

  return { content, footer };
}

// =============================================================================
// Normal Content (Sync Status)
// =============================================================================

function buildNormalContent(state: PluginState, actions: RouterActions): TabContent {
  const { syncStatus, codeSyncState, history } = state;

  // Build status section
  const statusCard = buildStatusCard(syncStatus, codeSyncState, history, actions);

  // Build workflow cards
  const syncCard = buildSyncCard(state, actions);
  const applyCard = buildApplyCard(state, actions);

  // Build activity section
  const activitySection = buildActivitySection(history, actions);

  const content = ContentArea([
    statusCard,
    Row([syncCard, applyCard], 'var(--spacing-md)'),
    activitySection,
  ]);

  // Make workflow cards equal width
  syncCard.classList.add('flex-1');
  applyCard.classList.add('flex-1');

  return { content, footer: null };
}

// =============================================================================
// Status Card
// =============================================================================

function buildStatusCard(
  syncStatus: PluginState['syncStatus'],
  codeSyncState: CodeSyncState | undefined,
  history: SyncEvent[],
  actions: RouterActions
): HTMLElement {
  const card = Card({ padding: 'lg' });
  card.classList.add('text-center');

  // Status indicator with action-specific messaging
  const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
    'in-sync': { type: 'success', label: 'In Sync' },
    'pending-changes': { type: 'warning', label: `${syncStatus.pendingChanges || 0} changes pending` },
    'out-of-sync': { type: 'error', label: 'Out of Sync' },
    'not-setup': { type: 'neutral', label: 'Waiting for First Sync' },
  };

  let status = statusMap[syncStatus.state] || statusMap['not-setup'];

  // Override label based on last action
  if (syncStatus.lastAction?.type === 'pr-created') {
    status = { type: 'warning', label: `PR #${syncStatus.lastAction.prNumber} pending review` };
  } else if (syncStatus.state === 'pending-changes' && syncStatus.lastAction?.type === 'cli-save') {
    const pendingCount = syncStatus.pendingChanges || 0;
    status = { type: 'warning', label: `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved for CLI` };
  }

  // Title
  const title = el('div', { class: 'text-xs text-tertiary uppercase tracking-wide mb-md' }, 'SYNC STATUS');

  // Visual representation
  const visual = el('div', { class: 'status-visual' });

  const figmaBox = el('div', { class: 'status-box' });
  const figmaIconBox = el('div', { class: 'status-icon-box' });
  figmaIconBox.appendChild(Icon('figma', 'lg'));
  figmaBox.appendChild(figmaIconBox);
  figmaBox.appendChild(el('span', { class: 'text-xs text-secondary' }, 'Figma'));

  const arrow = el('div', { class: 'text-tertiary' });
  arrow.appendChild(Icon('arrow-left-right', 'lg'));

  const codeBox = el('div', { class: 'status-box' });
  const codeIconBox = el('div', { class: 'status-icon-box' });
  codeIconBox.appendChild(Icon('code', 'lg'));
  codeBox.appendChild(codeIconBox);
  codeBox.appendChild(el('span', { class: 'text-xs text-secondary' }, 'Code'));

  visual.appendChild(figmaBox);
  visual.appendChild(arrow);
  visual.appendChild(codeBox);

  // Status indicator
  const statusIndicator = StatusIndicator(status);
  const statusWrapper = el('div', { class: 'flex justify-center mb-sm' });
  statusWrapper.appendChild(statusIndicator);

  // Last sync info
  let lastSyncText = '';
  if (syncStatus.lastSync) {
    const date = new Date(syncStatus.lastSync.timestamp);
    const timeAgo = getTimeAgo(date);
    lastSyncText = `Last synced ${timeAgo} by @${syncStatus.lastSync.user}`;
  } else if (history.length > 0) {
    const lastEvent = history[0];
    const date = new Date(lastEvent.timestamp);
    const timeAgo = getTimeAgo(date);
    lastSyncText = `Last synced ${timeAgo} by @${lastEvent.user}`;
  }

  const lastSync = el('div', { class: 'text-xs text-tertiary' }, lastSyncText);

  card.appendChild(title);
  card.appendChild(visual);
  card.appendChild(statusWrapper);
  if (lastSyncText) {
    card.appendChild(lastSync);
  }

  // Add code sync status indicator (only if we have a baseline and GitHub configured)
  if (syncStatus.state !== 'not-setup' && codeSyncState) {
    const codeSyncIndicator = buildCodeSyncIndicator(codeSyncState, syncStatus, actions);
    card.appendChild(codeSyncIndicator);
  }

  return card;
}

// =============================================================================
// Workflow Cards
// =============================================================================

function buildSyncCard(state: PluginState, actions: RouterActions): HTMLElement {
  const pendingCount = state.syncStatus.pendingChanges || 0;
  const lastAction = state.syncStatus.lastAction;

  const card = Card({ padding: 'md' });

  const title = el('div', { class: 'workflow-card-title' }, 'FIGMA \u2192 CODE');
  const divider = el('div', { class: 'workflow-card-divider workflow-card-divider--primary' });

  let statusText: string;
  let statusClass = 'text-sm';

  // Show action-specific status
  if (lastAction?.type === 'pr-created') {
    statusText = `PR #${lastAction.prNumber} pending review`;
    statusClass += ' text-warning';
  } else if (pendingCount > 0) {
    if (lastAction?.type === 'cli-save') {
      statusText = `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved for CLI`;
      statusClass += ' text-warning';
    } else {
      statusText = `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`;
      statusClass += ' text-warning';
    }
  } else if (state.syncStatus.state === 'not-setup') {
    statusText = 'Ready to sync your first tokens';
    statusClass += ' text-secondary';
  } else {
    statusText = 'Everything synced';
    statusClass += ' text-secondary';
  }

  const statusEl = el('div', { class: statusClass }, statusText);

  // Button container
  const buttonContainer = el('div', { class: 'flex flex-col gap-xs mt-md' });

  // Main sync button - different label for first-time setup
  const isFirstSync = state.syncStatus.state === 'not-setup';
  const syncButton = Button({
    label: isFirstSync ? 'Start Sync' : pendingCount > 0 ? 'Review & Sync' : 'View Status',
    variant: isFirstSync || pendingCount > 0 ? 'primary' : 'secondary',
    size: 'sm',
    fullWidth: true,
    onClick: () => actions.navigate('sync'),
  });

  buttonContainer.appendChild(syncButton);

  card.appendChild(title);
  card.appendChild(divider);
  card.appendChild(statusEl);
  card.appendChild(buttonContainer);

  return card;
}

function buildApplyCard(state: PluginState, actions: RouterActions): HTMLElement {
  const hasCodeBaseline = !!state.codeBaseline;
  const codeChanges = state.codeDiff ? countChanges(state.codeDiff) : 0;

  const card = Card({ padding: 'md', clickable: true, onClick: () => actions.navigate('apply') });

  const title = el('div', { class: 'workflow-card-title' }, 'CODE \u2192 FIGMA');
  const divider = el('div', { class: 'workflow-card-divider workflow-card-divider--secondary' });

  let statusText: string;
  let statusClass = 'text-sm';
  if (codeChanges > 0) {
    statusText = `${codeChanges} update${codeChanges === 1 ? '' : 's'} available`;
    statusClass += ' text-brand';
  } else if (!hasCodeBaseline) {
    statusText = 'Pull tokens from code';
    statusClass += ' text-secondary';
  } else {
    statusText = 'No updates available';
    statusClass += ' text-secondary';
  }

  const statusEl = el('div', { class: statusClass }, statusText);

  const button = Button({
    label: codeChanges > 0 ? 'Review & Apply' : hasCodeBaseline ? 'Check for Updates' : 'Connect',
    variant: codeChanges > 0 ? 'primary' : 'secondary',
    size: 'sm',
    fullWidth: true,
  });
  button.classList.add('mt-md');

  card.appendChild(title);
  card.appendChild(divider);
  card.appendChild(statusEl);
  card.appendChild(button);

  return card;
}

// =============================================================================
// Activity Section
// =============================================================================

function buildActivitySection(history: SyncEvent[], actions: RouterActions): HTMLElement {
  const section = el('div');

  const headerRow = el('div', { class: 'flex items-center justify-between mb-sm' });
  headerRow.appendChild(el('span', { class: 'text-sm font-medium' }, 'RECENT ACTIVITY'));

  if (history.length > 0) {
    const viewAllBtn = Button({
      label: 'View All',
      variant: 'ghost',
      size: 'sm',
      onClick: () => actions.navigate('history'),
    });
    headerRow.appendChild(viewAllBtn);
  }

  section.appendChild(headerRow);

  if (history.length === 0) {
    const emptyText = el('div', { class: 'text-sm text-tertiary py-md' }, 'No activity yet');
    section.appendChild(emptyText);
  } else {
    const list = el('div', { class: 'flex flex-col gap-xs' });

    // Show last 3 events
    for (const event of history.slice(0, 3)) {
      const item = buildActivityItem(event);
      list.appendChild(item);
    }

    section.appendChild(list);
  }

  return section;
}

function buildActivityItem(event: SyncEvent): HTMLElement {
  const date = new Date(event.timestamp);
  const timeAgo = getTimeAgo(date);
  const directionLabel = event.direction === 'to-code' ? 'synced' : 'applied';

  const item = el('div', { class: 'activity-item' });

  const iconWrapper = el('span', { class: 'text-tertiary inline-flex items-center' });
  iconWrapper.appendChild(Icon(event.direction === 'to-code' ? 'upload' : 'download', 'sm'));
  const textEl = el('span', { class: 'text-xs flex-1' });
  textEl.innerHTML = `<strong>@${event.user}</strong> ${directionLabel} ${event.changeCount} token${event.changeCount === 1 ? '' : 's'}`;
  const time = el('span', { class: 'text-xs text-tertiary' }, timeAgo);

  item.appendChild(iconWrapper);
  item.appendChild(textEl);
  item.appendChild(time);

  return item;
}

// =============================================================================
// Code Sync Status Indicator
// =============================================================================

function buildCodeSyncIndicator(
  codeSyncState: CodeSyncState,
  syncStatus: PluginState['syncStatus'],
  actions: RouterActions
): HTMLElement {
  const container = el('div', { class: 'mt-md pt-md', style: 'border-top: 1px solid var(--color-border);' });

  const statusConfig: Record<string, { icon: string; label: string; color: string; class: string }> = {
    'synced': {
      icon: 'check',
      label: 'Code is synced',
      color: 'var(--color-success)',
      class: 'text-success',
    },
    'pr-pending': {
      icon: 'github',
      label: 'PR pending merge',
      color: 'var(--color-brand)',
      class: 'text-brand',
    },
    'pending-pull': {
      icon: 'clock',
      label: 'Waiting for code',
      color: 'var(--color-warning)',
      class: 'text-warning',
    },
    'checking': {
      icon: 'refresh',
      label: 'Checking...',
      color: 'var(--color-secondary)',
      class: 'text-secondary',
    },
    'not-connected': {
      icon: 'link',
      label: 'Remote not configured',
      color: 'var(--color-tertiary)',
      class: 'text-tertiary',
    },
  };

  // Determine the status to display
  let displayStatus = codeSyncState.status;

  // If PR is pending and it's a pr-created action, show pr-pending
  if (syncStatus.lastAction?.type === 'pr-created' && codeSyncState.status === 'pending-pull') {
    displayStatus = 'pr-pending';
  }

  const config = statusConfig[displayStatus] || statusConfig['not-connected'];

  // Build the indicator row
  const row = el('div', { class: 'flex items-center justify-center gap-xs' });

  // Icon
  const iconWrapper = el('span', { style: `color: ${config.color};` });
  iconWrapper.appendChild(Icon(config.icon as 'check' | 'github' | 'clock' | 'refresh' | 'link', 'sm'));
  row.appendChild(iconWrapper);

  // Label
  row.appendChild(el('span', { class: `text-xs ${config.class}` }, config.label));

  // Refresh button (only if connected and not currently checking)
  if (displayStatus !== 'not-connected' && displayStatus !== 'checking') {
    const refreshBtn = el('button', {
      class: 'text-tertiary hover:text-secondary ml-xs',
      style: 'background: none; border: none; cursor: pointer; padding: 2px;',
      title: 'Refresh status',
    });
    refreshBtn.appendChild(Icon('refresh', 'xs'));
    refreshBtn.addEventListener('click', () => {
      actions.send({ type: 'check-code-sync' });
    });
    row.appendChild(refreshBtn);
  }

  container.appendChild(row);

  // Show error message if there's one
  if (codeSyncState.error && displayStatus === 'pending-pull') {
    container.appendChild(el('div', { class: 'text-xs text-tertiary mt-xs', style: 'max-width: 200px; text-align: center; margin: 0 auto;' }, codeSyncState.error));
  } else if (codeSyncState.lastChecked) {
    const lastChecked = new Date(codeSyncState.lastChecked);
    const timeAgo = getTimeAgo(lastChecked);
    container.appendChild(el('div', { class: 'text-xs text-tertiary mt-xs' }, `Checked ${timeAgo}`));
  }

  return container;
}

// =============================================================================
// Helpers
// =============================================================================

function countChanges(diff: PluginState['syncDiff']): number {
  if (!diff) return 0;
  return (
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.newVariables.length +
    diff.deletedVariables.length +
    diff.styleValueChanges.length +
    diff.stylePathChanges.length +
    diff.newStyles.length +
    diff.deletedStyles.length
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
