/**
 * Token Vault - Figma Plugin Entry Point
 * Import, export, and sync design tokens as Figma Variables
 *
 * This is the main entry point for the plugin backend.
 * All business logic is delegated to specialized modules.
 *
 * @module code
 */

import { handleMessage } from './backend/handlers/message-router.js';

/**
 * Initialize plugin UI
 * Shows the plugin window with configured dimensions and theme support
 */
figma.showUI(__html__, {
  width: 600,
  height: 700,
  themeColors: true
});

/**
 * Message handler
 * Routes all messages from UI to the message router
 */
figma.ui.onmessage = async (msg) => {
  await handleMessage(msg);
};
