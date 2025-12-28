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
  Icon,
  IconCircle,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createColumn,
  createRow,
} from '../ui/router';

export function HomeScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { syncStatus, history } = state;

  // Build status section
  const statusCard = buildStatusCard(syncStatus, history);

  // Build workflow cards
  const syncCard = buildSyncCard(state, actions);
  const applyCard = buildApplyCard(state, actions);

  // Build activity section
  const activitySection = buildActivitySection(history, actions);

  // Settings button for header
  const settingsBtn = el('button', {
    style: 'background: none; border: none; padding: 6px; cursor: pointer; border-radius: var(--radius-sm); color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center;',
  });
  settingsBtn.appendChild(Icon('settings', 'md'));
  settingsBtn.addEventListener('click', () => actions.navigate('settings'));
  settingsBtn.addEventListener('mouseenter', () => {
    settingsBtn.style.background = 'var(--color-bg-secondary)';
    settingsBtn.style.color = 'var(--color-text)';
  });
  settingsBtn.addEventListener('mouseleave', () => {
    settingsBtn.style.background = 'none';
    settingsBtn.style.color = 'var(--color-text-secondary)';
  });

  const header = Header({
    title: 'Synkio',
    rightAction: settingsBtn,
  });

  const content = createContentArea([
    statusCard,
    createRow([syncCard, applyCard], 'var(--spacing-md)'),
    activitySection,
  ]);

  // Make workflow cards equal width
  syncCard.style.flex = '1';
  applyCard.style.flex = '1';

  return createPageLayout([header, content]);
}

function buildStatusCard(syncStatus: PluginState['syncStatus'], history: SyncEvent[]): HTMLElement {
  const card = Card({ padding: 'lg' });
  card.style.cssText = 'text-align: center;';

  // Status indicator
  const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
    'in-sync': { type: 'success', label: 'In Sync' },
    'pending-changes': { type: 'warning', label: `${syncStatus.pendingChanges || 0} changes pending` },
    'out-of-sync': { type: 'error', label: 'Out of Sync' },
    'not-setup': { type: 'neutral', label: 'Not Set Up' },
  };

  const status = statusMap[syncStatus.state] || statusMap['not-setup'];

  // Title
  const title = el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-md);' }, 'SYNC STATUS');

  // Visual representation
  const visual = el('div', { style: 'display: flex; align-items: center; justify-content: center; gap: var(--spacing-xl); margin: var(--spacing-lg) 0;' });

  const figmaBox = el('div', { style: 'display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);' });
  const figmaIconBox = el('div', { style: 'width: 48px; height: 48px; border: 2px solid var(--color-border); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary);' });
  figmaIconBox.appendChild(Icon('figma', 'lg'));
  figmaBox.appendChild(figmaIconBox);
  figmaBox.appendChild(el('span', { style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary);' }, 'Figma'));

  const arrow = el('div', { style: 'color: var(--color-text-tertiary);' });
  arrow.appendChild(Icon('arrow-left-right', 'lg'));

  const codeBox = el('div', { style: 'display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);' });
  const codeIconBox = el('div', { style: 'width: 48px; height: 48px; border: 2px solid var(--color-border); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary);' });
  codeIconBox.appendChild(Icon('code', 'lg'));
  codeBox.appendChild(codeIconBox);
  codeBox.appendChild(el('span', { style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary);' }, 'Code'));

  visual.appendChild(figmaBox);
  visual.appendChild(arrow);
  visual.appendChild(codeBox);

  // Status indicator
  const statusIndicator = StatusIndicator(status);
  const statusWrapper = el('div', { style: 'display: flex; justify-content: center; margin-bottom: var(--spacing-sm);' });
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

  const lastSync = el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary);' }, lastSyncText);

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

  const title = el('div', { style: 'font-weight: 500; margin-bottom: var(--spacing-xs);' }, 'FIGMA \u2192 CODE');
  const divider = el('div', { style: 'width: 40px; height: 2px; background: var(--color-primary); margin-bottom: var(--spacing-sm);' });

  let statusText: string;
  if (pendingCount > 0) {
    statusText = `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`;
  } else if (state.syncStatus.state === 'not-setup') {
    statusText = 'Set up sync';
  } else {
    statusText = 'Everything synced';
  }

  const status = el('div', { style: `font-size: var(--font-size-sm); color: ${pendingCount > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)'};` }, statusText);

  const button = Button({
    label: pendingCount > 0 ? 'Review & Sync' : 'View Status',
    variant: pendingCount > 0 ? 'primary' : 'secondary',
    size: 'sm',
    fullWidth: true,
  });
  button.style.marginTop = 'var(--spacing-md)';

  card.appendChild(title);
  card.appendChild(divider);
  card.appendChild(status);
  card.appendChild(button);

  return card;
}

function buildApplyCard(state: PluginState, actions: RouterActions): HTMLElement {
  const hasCodeBaseline = !!state.codeBaseline;
  const codeChanges = state.codeDiff ? countChanges(state.codeDiff) : 0;

  const card = Card({ padding: 'md', clickable: true, onClick: () => actions.navigate('apply') });

  const title = el('div', { style: 'font-weight: 500; margin-bottom: var(--spacing-xs);' }, 'CODE \u2192 FIGMA');
  const divider = el('div', { style: 'width: 40px; height: 2px; background: var(--color-renamed); margin-bottom: var(--spacing-sm);' });

  let statusText: string;
  if (codeChanges > 0) {
    statusText = `${codeChanges} update${codeChanges === 1 ? '' : 's'} available`;
  } else if (!hasCodeBaseline) {
    statusText = 'Connect to repository';
  } else {
    statusText = 'No updates available';
  }

  const status = el('div', { style: `font-size: var(--font-size-sm); color: ${codeChanges > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'};` }, statusText);

  const button = Button({
    label: codeChanges > 0 ? 'Review & Apply' : hasCodeBaseline ? 'Check for Updates' : 'Connect',
    variant: codeChanges > 0 ? 'primary' : 'secondary',
    size: 'sm',
    fullWidth: true,
  });
  button.style.marginTop = 'var(--spacing-md)';

  card.appendChild(title);
  card.appendChild(divider);
  card.appendChild(status);
  card.appendChild(button);

  return card;
}

function buildActivitySection(history: SyncEvent[], actions: RouterActions): HTMLElement {
  const section = el('div');

  const headerRow = el('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm);' });
  headerRow.appendChild(el('span', { style: 'font-size: var(--font-size-sm); font-weight: 500;' }, 'RECENT ACTIVITY'));

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
    const emptyText = el('div', { style: 'font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--spacing-md) 0;' }, 'No activity yet');
    section.appendChild(emptyText);
  } else {
    const list = el('div', { style: 'display: flex; flex-direction: column; gap: var(--spacing-xs);' });

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

  const item = el('div', { style: 'display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-md);' });

  const iconWrapper = el('span', { style: 'color: var(--color-text-tertiary); display: flex; align-items: center;' });
  iconWrapper.appendChild(Icon(event.direction === 'to-code' ? 'upload' : 'download', 'sm'));
  const textEl = el('span', { style: 'font-size: var(--font-size-xs); flex: 1;' });
  textEl.innerHTML = `<strong>@${event.user}</strong> ${directionLabel} ${event.changeCount} token${event.changeCount === 1 ? '' : 's'}`;
  const time = el('span', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary);' }, timeAgo);

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
