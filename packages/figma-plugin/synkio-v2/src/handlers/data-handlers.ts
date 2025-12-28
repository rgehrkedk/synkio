// =============================================================================
// Data Handlers - Clear all data
// =============================================================================

import { clearAllStorage } from '../lib/storage';
import { SendMessage } from './types';

// =============================================================================
// handleClearAllData - Clear all plugin data
// =============================================================================

export async function handleClearAllData(send: SendMessage): Promise<void> {
  await clearAllStorage();
  send({ type: 'data-cleared' });
}
