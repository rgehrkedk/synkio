/**
 * Sync history management
 */

import type { SyncEvent } from './types';

const MAX_HISTORY_ENTRIES = 5;

export function addHistoryEntry(
  existing: SyncEvent[],
  newEntry: SyncEvent
): SyncEvent[] {
  const updated = [newEntry].concat(existing);
  return updated.slice(0, MAX_HISTORY_ENTRIES);
}

export function parseHistory(json: string): SyncEvent[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function serializeHistory(events: SyncEvent[]): string {
  return JSON.stringify(events.slice(0, MAX_HISTORY_ENTRIES));
}
