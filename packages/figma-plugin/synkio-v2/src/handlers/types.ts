// =============================================================================
// Handler Types
// =============================================================================

import { MessageToUI } from '../lib/types';

/**
 * Function type for sending messages to the UI.
 */
export type SendMessage = (message: MessageToUI) => void;
