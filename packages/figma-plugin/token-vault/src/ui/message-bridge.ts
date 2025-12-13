/**
 * Message Bridge
 *
 * Type-safe message passing between UI and plugin backend.
 * Provides a clean API for sending and receiving messages.
 */

import type { FigmaCollection } from './state';

/**
 * Messages that can be sent from UI to backend
 */
export type UIMessage =
  | { type: 'import-tokens'; data: { collections: unknown[] } }
  | { type: 'export-baseline'; collectionIds: string[] }
  | { type: 'sync-to-node'; collectionIds: string[] }
  | { type: 'get-collections' }
  | { type: 'get-last-sync' }
  | { type: 'cancel' };

/**
 * Messages that can be received from backend
 */
export type PluginMessage =
  | { type: 'collections-loaded'; collections: FigmaCollection[] }
  | { type: 'last-sync-loaded'; exists: boolean; nodeId?: string; variableCount?: number; updatedAt?: string }
  | { type: 'import-complete'; message: string }
  | { type: 'import-error'; message: string }
  | { type: 'export-complete'; data: unknown }
  | { type: 'export-error'; message: string }
  | { type: 'sync-complete'; nodeId: string; variableCount: number }
  | { type: 'sync-error'; message: string };

/**
 * Message handler callback type
 */
export type MessageHandler = (message: PluginMessage) => void;

/**
 * Send a message to the plugin backend
 * @param message - The message to send
 */
export function sendMessage(message: UIMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Register a message handler for backend messages
 * @param handler - Callback function to handle messages
 */
export function onMessage(handler: MessageHandler): void {
  window.onmessage = (event: MessageEvent) => {
    const msg = event.data.pluginMessage as PluginMessage | undefined;
    if (msg) {
      handler(msg);
    }
  };
}
