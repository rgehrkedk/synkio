/**
 * Message Bridge
 *
 * Type-safe message passing between UI and plugin backend.
 * Provides a clean API for sending and receiving messages.
 */

import type { UIMessage, PluginMessage } from '../types/message.types.js';

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
