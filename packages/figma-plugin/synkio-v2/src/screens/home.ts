// =============================================================================
// Home Screen - Status Overview
// =============================================================================

import { PluginState, SyncEvent } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Card,
  Button,
  StatusIndicator,
  IconButton,
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout,
  ContentArea,
  Row,
} from '../ui/layout/index';

export function HomeScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { syncStatus, history } = state;

  // Build status section
  const statusCard = buildStatusCard(syncStatus, history);

  // Build workflow cards
  const syncCard = buildSyncCard(state, actions);
  const applyCard = buildApplyCard(state, actions);

  // Build activity section
  const activitySection = buildActivitySection(history, actions);

  // Settings button for header using IconButton
  const settingsBtn = IconButton({
    icon: 'settings',
    variant: 'ghost',
    onClick: () => actions.navigate('settings'),
    ariaLabel: 'Settings',
  });

  const header = Header({
    title: 'Synkio',
    rightAction: settingsBtn,
  });

  const content = ContentArea([
    statusCard,
    Row([syncCard, applyCard], 'var(--spacing-md)'),
    activitySection,
  ]);

  // Make workflow cards equal width
  syncCard.classList.add('flex-1');
  applyCard.classList.add('flex-1');

  return PageLayout([header, content]);
}

function buildStatusCard(syncStatus: PluginState['syncStatus'], history: SyncEvent[]): HTMLElement {
  const card = Card({ padding: 'lg' });
  card.classList.add('text-center');

  // Status indicator
  const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
    'in-sync': { type: 'success', label: 'In Sync' },
    'pending-changes': { type: 'warning', label: `${syncStatus.pendingChanges || 0} changes pending` },
    'out-of-sync': { type: 'error', label: 'Out of Sync' },
    'not-setup': { type: 'neutral', label: 'Not Set Up' },
  };

  const status = statusMap[syncStatus.state] || statusMap['not-setup'];

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

  return card;
}

function buildSyncCard(state: PluginState, actions: RouterActions): HTMLElement {
  const pendingCount = state.syncStatus.pendingChanges || 0;

  const card = Card({ padding: 'md', clickable: true, onClick: () => actions.navigate('sync') });

  const title = el('div', { class: 'workflow-card-title' }, 'FIGMA \u2192 CODE');
  const divider = el('div', { class: 'workflow-card-divider workflow-card-divider--primary' });

  let statusText: string;
  let statusClass = 'text-sm';
  if (pendingCount > 0) {
    statusText = `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`;
    statusClass += ' text-warning';
  } else if (state.syncStatus.state === 'not-setup') {
    statusText = 'Set up sync';
    statusClass += ' text-secondary';
  } else {
    statusText = 'Everything synced';
    statusClass += ' text-secondary';
  }

  const statusEl = el('div', { class: statusClass }, statusText);

  const button = Button({
    label: pendingCount > 0 ? 'Review & Sync' : 'View Status',
    variant: pendingCount > 0 ? 'primary' : 'secondary',
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
    statusText = 'Connect to repository';
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

// Helpers

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
