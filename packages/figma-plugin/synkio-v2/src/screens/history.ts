// =============================================================================
// History Screen
// =============================================================================

import { PluginState, SyncEvent } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Card,
  EmptyState,
  Icon,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createColumn,
} from '../ui/router';

export function HistoryScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { history } = state;

  // Header
  const header = Header({
    title: 'HISTORY',
    showBack: true,
    onBack: () => actions.navigate('home'),
  });

  let contentChildren: HTMLElement[] = [];

  if (history.length === 0) {
    contentChildren.push(
      EmptyState({
        icon: 'history',
        title: 'No history yet',
        description: 'Your sync history will appear here after your first sync.',
      })
    );
  } else {
    // Group by date
    const groupedByDate = groupEventsByDate(history);

    for (const [dateLabel, events] of Object.entries(groupedByDate)) {
      const dateSection = el('div');

      // Date header
      const dateHeader = el('div', {
        style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);',
      }, dateLabel);
      dateSection.appendChild(dateHeader);

      // Events list
      const eventsList = el('div', {
        style: 'display: flex; flex-direction: column; gap: var(--spacing-sm);',
      });

      for (const event of events) {
        eventsList.appendChild(buildHistoryItem(event));
      }

      dateSection.appendChild(eventsList);
      contentChildren.push(dateSection);
    }
  }

  const content = createContentArea(contentChildren);
  return createPageLayout([header, content]);
}

function buildHistoryItem(event: SyncEvent): HTMLElement {
  const card = Card({ padding: 'md' });

  // Header row
  const headerRow = el('div', {
    style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-xs);',
  });

  // Time and direction
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const directionBadge = el('span', {
    style: `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      ${event.direction === 'to-code'
        ? 'background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary);'
        : 'background: color-mix(in srgb, var(--color-renamed) 15%, transparent); color: var(--color-renamed);'
      }
    `,
  });
  directionBadge.appendChild(Icon(event.direction === 'to-code' ? 'upload' : 'download', 'xs'));
  directionBadge.appendChild(el('span', {}, event.direction === 'to-code' ? 'SYNC' : 'APPLY'));

  const timeLabel = el('span', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary);',
  }, timeStr);

  headerRow.appendChild(directionBadge);
  headerRow.appendChild(timeLabel);

  // User and changes
  const detailRow = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-sm);',
  });

  const userLabel = el('span', {
    style: 'font-size: var(--font-size-sm); font-weight: 500;',
  }, `@${event.user}`);

  const actionLabel = el('span', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary);',
  }, event.direction === 'to-code' ? 'synced' : 'applied');

  const changeCount = el('span', {
    style: 'font-size: var(--font-size-sm); font-weight: 500;',
  }, `${event.changeCount} token${event.changeCount === 1 ? '' : 's'}`);

  detailRow.appendChild(userLabel);
  detailRow.appendChild(actionLabel);
  detailRow.appendChild(changeCount);

  card.appendChild(headerRow);
  card.appendChild(detailRow);

  // Show changed paths if available
  if (event.changes && event.changes.length > 0) {
    const changesSection = el('div', {
      style: 'margin-top: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border);',
    });

    const pathsList = el('div', {
      style: 'display: flex; flex-direction: column; gap: 2px; font-family: "SF Mono", Menlo, monospace; font-size: var(--font-size-xs); color: var(--color-text-secondary);',
    });

    const pathsToShow = event.changes.slice(0, 5);
    for (const path of pathsToShow) {
      pathsList.appendChild(el('div', {}, path));
    }

    if (event.changes.length > 5) {
      pathsList.appendChild(el('div', {
        style: 'color: var(--color-text-tertiary);',
      }, `...and ${event.changes.length - 5} more`));
    }

    changesSection.appendChild(pathsList);
    card.appendChild(changesSection);
  }

  return card;
}

function groupEventsByDate(events: SyncEvent[]): Record<string, SyncEvent[]> {
  const groups: Record<string, SyncEvent[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    let label: string;
    if (eventDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (eventDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(event);
  }

  return groups;
}
