// =============================================================================
// Settings Handlers - Get/Save settings, get history
// =============================================================================

import {
  PluginSettings,
  RemoteSettings,
  SyncEvent,
  StyleType,
} from '../lib/types';

import {
  loadSimple,
  KEYS,
  loadClientStorage,
  saveClientStorage,
} from '../lib/storage';

import { SendMessage } from './types';

// =============================================================================
// handleGetSettings - Get plugin settings
// =============================================================================

export async function handleGetSettings(send: SendMessage): Promise<void> {
  const settings = await loadClientStorage<PluginSettings>('settings');
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

  send({
    type: 'settings-update',
    settings: settings || {
      remote: {
        enabled: false,
        source: 'none',
        autoCheck: false,
      },
      excludedCollections,
      excludedStyleTypes,
    },
  });
}

// =============================================================================
// handleSaveSettings - Save remote settings
// =============================================================================

export async function handleSaveSettings(
  partial: Partial<RemoteSettings>,
  send: SendMessage
): Promise<void> {
  const settings = await loadClientStorage<PluginSettings>('settings') || {
    remote: { enabled: false, source: 'none', autoCheck: false },
    excludedCollections: [],
    excludedStyleTypes: [],
  };

  settings.remote = { ...settings.remote, ...partial };
  await saveClientStorage('settings', settings);

  await handleGetSettings(send);
}

// =============================================================================
// handleGetHistory - Get sync history
// =============================================================================

export function handleGetHistory(send: SendMessage): void {
  const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
  send({
    type: 'history-update',
    history,
  });
}
