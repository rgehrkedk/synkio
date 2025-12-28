// =============================================================================
// Synkio Figma Plugin - Main Code (runs in Figma sandbox)
// =============================================================================

import { MessageToCode, MessageToUI } from './lib/types';
import { handleMessage } from './handlers';
import { debug } from './lib/debug';

// =============================================================================
// Plugin Initialization
// =============================================================================

figma.showUI(__html__, {
  width: 360,
  height: 560,
  themeColors: true,
});

// =============================================================================
// Message Handling
// =============================================================================

/**
 * Send a message to the UI
 */
function sendMessage(message: MessageToUI): void {
  figma.ui.postMessage(message);
}

/**
 * Handle incoming messages from the UI
 */
figma.ui.onmessage = async (message: MessageToCode) => {
  debug('Plugin received:', message.type);
  await handleMessage(message, sendMessage);
};
