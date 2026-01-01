// =============================================================================
// Handler Registry - Maps message types to handler functions
// =============================================================================

import { MessageToCode } from '../lib/types';
import { SendMessage } from './types';

// Import all handlers
import { handleReady, handleInit, handleSync, handleCompleteOnboarding } from './sync-handlers';
import {
  handleGetCollections,
  handleSaveExcludedCollections,
  handleGetStyleTypes,
  handleSaveExcludedStyleTypes,
} from './collection-handlers';
import {
  handleFetchRemote,
  handleFetchRemoteResult,
  handleFetchRemoteError,
  handleTestConnection,
  handleCheckCodeSync,
  handleCodeSyncResult,
  handleCodeSyncError,
} from './remote-handlers';
import { handleImportBaseline, handleApplyToFigma } from './apply-handlers';
import { handleGetSettings, handleSaveSettings, handleGetHistory } from './settings-handlers';
import { handleClearAllData } from './data-handlers';
import { handleCreatePR, handlePRCreated } from './pr-handlers';

// Re-export types
export type { SendMessage } from './types';

// =============================================================================
// Main Message Handler
// =============================================================================

/**
 * Handle incoming messages from the UI.
 * Routes messages to appropriate handler functions.
 *
 * @param message - The message received from UI
 * @param send - Function to send messages back to UI
 */
export async function handleMessage(
  message: MessageToCode,
  send: SendMessage
): Promise<void> {
  try {
    switch (message.type) {
      case 'ready':
        await handleReady(send);
        break;

      case 'init':
        await handleInit(send);
        break;

      case 'sync':
        await handleSync(send);
        break;

      case 'get-collections':
        await handleGetCollections(send);
        break;

      case 'save-excluded-collections':
        await handleSaveExcludedCollections(message.collections, send);
        break;

      case 'get-style-types':
        await handleGetStyleTypes(send);
        break;

      case 'save-excluded-style-types':
        await handleSaveExcludedStyleTypes(message.styleTypes, send);
        break;

      case 'fetch-remote':
        await handleFetchRemote(send);
        break;

      case 'fetch-remote-result':
        await handleFetchRemoteResult(message.content, send);
        break;

      case 'fetch-remote-error':
        handleFetchRemoteError(message.error, send);
        break;

      case 'import-baseline':
        await handleImportBaseline(message.data, send);
        break;

      case 'apply-to-figma':
        await handleApplyToFigma(send);
        break;

      case 'get-settings':
        await handleGetSettings(send);
        break;

      case 'save-settings':
        await handleSaveSettings(message.settings, send);
        break;

      case 'get-history':
        handleGetHistory(send);
        break;

      case 'test-connection':
        await handleTestConnection(send);
        break;

      case 'clear-all-data':
        await handleClearAllData(send);
        break;

      case 'create-pr':
        await handleCreatePR(send);
        break;

      case 'pr-created-result':
        await handlePRCreated(message.prUrl, message.prNumber, send);
        send({ type: 'pr-created', prUrl: message.prUrl, prNumber: message.prNumber });
        break;

      case 'pr-created-error':
        send({ type: 'pr-error', error: message.error });
        break;

      case 'check-code-sync':
        await handleCheckCodeSync(send);
        break;

      case 'code-sync-result':
        await handleCodeSyncResult(message.content, send);
        break;

      case 'code-sync-error':
        handleCodeSyncError(message.error, send);
        break;

      case 'close':
        figma.closePlugin();
        break;

      case 'complete-onboarding':
        handleCompleteOnboarding();
        break;

      // Navigate messages are handled by UI, not plugin code
      case 'navigate':
        // No-op in plugin code
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    send({
      type: 'state-update',
      state: { isLoading: false, error: String(error) },
    });
  }
}
