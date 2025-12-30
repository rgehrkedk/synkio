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
  Badge,
} from '../ui/components/index';
import {
  PageLayout as createPageLayout,
  ContentArea as createContentArea,
} from '../ui/layout/index';

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
        class: 'date-header',
      }, dateLabel);
      dateSection.appendChild(dateHeader);

      // Events list
      const eventsList = el('div', {
        class: 'flex flex-col gap-sm',
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
    class: 'flex items-center justify-between mb-xs',
  });

  // Time and direction
  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Use Badge component for direction
  const directionBadge = Badge({
    variant: event.direction === 'to-code' ? 'sync' : 'apply',
    icon: event.direction === 'to-code' ? 'upload' : 'download',
    label: event.direction === 'to-code' ? 'SYNC' : 'APPLY',
  });

  const timeLabel = el('span', {
    class: 'text-sm text-secondary',
  }, timeStr);

  headerRow.appendChild(directionBadge);
  headerRow.appendChild(timeLabel);

  // User and changes
  const detailRow = el('div', {
    class: 'flex items-center gap-sm',
  });

  const userLabel = el('span', {
    class: 'text-sm font-medium',
  }, `@${event.user}`);

  const actionLabel = el('span', {
    class: 'text-sm text-secondary',
  }, event.direction === 'to-code' ? 'synced' : 'applied');

  const changeCount = el('span', {
    class: 'text-sm font-medium',
  }, `${event.changeCount} token${event.changeCount === 1 ? '' : 's'}`);

  detailRow.appendChild(userLabel);
  detailRow.appendChild(actionLabel);
  detailRow.appendChild(changeCount);

  card.appendChild(headerRow);
  card.appendChild(detailRow);

  // Show changed paths if available
  if (event.changes && event.changes.length > 0) {
    const changesSection = el('div', {
      class: 'mt-sm pt-sm border-t',
    });

    const pathsList = el('div', {
      class: 'flex flex-col gap-xs font-mono text-xs text-secondary',
    });

    const pathsToShow = event.changes.slice(0, 5);
    for (const path of pathsToShow) {
      pathsList.appendChild(el('div', {}, path));
    }

    if (event.changes.length > 5) {
      pathsList.appendChild(el('div', {
        class: 'text-tertiary',
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
