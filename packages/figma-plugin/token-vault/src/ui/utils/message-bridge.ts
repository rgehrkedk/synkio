/**
 * Message Bridge
 * Type-safe communication layer between UI and plugin backend
 */

import type { UIMessage, PluginMessage } from '../../types/message.types.js';

/**
 * Message handler callback
 */
export type MessageHandler = (message: PluginMessage) => void;

/**
 * Registered message handlers
 */
const handlers: Set<MessageHandler> = new Set();

/**
 * Send a message to the plugin backend
 * @param message - Typed message to send
 */
export function sendToBackend(message: UIMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Register a handler for messages from the backend
 * @param handler - Callback to invoke when messages are received
 * @returns Unsubscribe function
 */
export function onBackendMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Initialize message bridge (sets up global message listener)
 * Call this once when the UI loads
 */
export function initMessageBridge(): void {
  window.onmessage = (event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    // Notify all registered handlers
    handlers.forEach((handler) => handler(msg as PluginMessage));
  };
}

/**
 * Type guards for specific message types
 */
export const isMessage = {
  collectionsLoaded: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'collections-loaded' }> =>
    msg.type === 'collections-loaded',

  lastSyncLoaded: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'last-sync-loaded' }> =>
    msg.type === 'last-sync-loaded',

  importComplete: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'import-complete' }> =>
    msg.type === 'import-complete',

  importError: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'import-error' }> =>
    msg.type === 'import-error',

  exportComplete: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'export-complete' }> =>
    msg.type === 'export-complete',

  exportError: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'export-error' }> =>
    msg.type === 'export-error',

  syncComplete: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'sync-complete' }> =>
    msg.type === 'sync-complete',

  syncError: (msg: PluginMessage): msg is Extract<PluginMessage, { type: 'sync-error' }> =>
    msg.type === 'sync-error',
};
