/**
 * Success Screen Component
 *
 * Manages the sync success screen display with node ID copying functionality.
 * Shows after successful sync to node operation.
 */

/**
 * Shows the sync success screen with sync details
 * @param nodeId - The registry node ID
 * @param variableCount - Number of variables synced
 */
export function showSyncSuccess(nodeId: string, variableCount: number): void {
  // Hide the regular sync content and show success screen
  const successScreen = document.getElementById('syncSuccessScreen');

  if (successScreen) {
    successScreen.classList.add('active');
  }

  // Update values
  const nodeIdText = document.querySelector('#syncNodeIdValue .node-id-text');
  if (nodeIdText) {
    nodeIdText.textContent = nodeId;
  }

  const variableCountEl = document.getElementById('syncVariableCount');
  if (variableCountEl) {
    variableCountEl.textContent = variableCount.toLocaleString();
  }

  const timestampEl = document.getElementById('syncTimestamp');
  if (timestampEl) {
    timestampEl.textContent = new Date().toLocaleTimeString();
  }

  // Hide the action footer when showing success
  const actionFooter = document.querySelector('.action-footer');
  if (actionFooter) {
    actionFooter.classList.add('hidden');
  }
}

/**
 * Hides the sync success screen and returns to normal sync view
 */
export function hideSyncSuccess(): void {
  resetSyncSuccessScreen();
  // Show the action footer again
  const actionFooter = document.querySelector('.action-footer');
  if (actionFooter) {
    actionFooter.classList.remove('hidden');
  }
}

/**
 * Resets the sync success screen to hidden state
 */
export function resetSyncSuccessScreen(): void {
  const successScreen = document.getElementById('syncSuccessScreen');

  if (successScreen) {
    successScreen.classList.remove('active');
  }
}

/**
 * Initializes event handlers for the sync success screen
 */
export function initSyncSuccessScreen(): void {
  // Copy node ID to clipboard
  const syncNodeIdValue = document.getElementById('syncNodeIdValue');
  if (syncNodeIdValue) {
    syncNodeIdValue.addEventListener('click', function() {
      const nodeIdEl = this.querySelector('.node-id-text');
      const nodeId = nodeIdEl?.textContent;

      if (nodeId && nodeId !== '--') {
        navigator.clipboard.writeText(nodeId).then(() => {
          const original = nodeId;
          if (nodeIdEl) {
            nodeIdEl.textContent = 'Copied!';
            setTimeout(() => {
              nodeIdEl.textContent = original;
            }, 1500);
          }
        });
      }
    });
  }

  // Sync again button
  const syncAgainBtn = document.getElementById('syncAgainBtn');
  if (syncAgainBtn) {
    syncAgainBtn.addEventListener('click', () => {
      hideSyncSuccess();
    });
  }

  // Close button
  const closeSyncSuccessBtn = document.getElementById('closeSyncSuccessBtn');
  if (closeSyncSuccessBtn) {
    closeSyncSuccessBtn.addEventListener('click', () => {
      parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
    });
  }
}
