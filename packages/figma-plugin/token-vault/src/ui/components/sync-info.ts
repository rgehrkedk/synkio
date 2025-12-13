/**
 * Sync Info Component
 *
 * Displays last sync information including node ID, variable count, and timestamp.
 */

import { formatTimeAgo } from '../utils/format';

/**
 * Shows the last sync info in the sync tab
 * @param nodeId - The registry node ID
 * @param variableCount - Number of variables synced
 * @param updatedAt - ISO timestamp of last sync
 */
export function showLastSyncInfo(nodeId: string, variableCount: number, updatedAt: string): void {
  const container = document.getElementById('lastSyncInfo');
  if (!container) return;

  container.style.display = 'block';

  const nodeIdEl = document.getElementById('lastSyncNodeId');
  if (nodeIdEl) {
    nodeIdEl.textContent = nodeId;
  }

  const variablesEl = document.getElementById('lastSyncVariables');
  if (variablesEl) {
    variablesEl.textContent = variableCount ? variableCount.toLocaleString() : '--';
  }

  const timeEl = document.getElementById('lastSyncTime');
  if (timeEl && updatedAt) {
    timeEl.textContent = formatTimeAgo(updatedAt);
  }
}

/**
 * Initialize sync info component with click-to-copy functionality
 */
export function initSyncInfo(): void {
  const nodeIdEl = document.getElementById('lastSyncNodeId');
  if (nodeIdEl) {
    nodeIdEl.addEventListener('click', function() {
      const nodeId = this.textContent;
      if (nodeId && nodeId !== '--') {
        navigator.clipboard.writeText(nodeId).then(() => {
          const original = nodeId;
          this.textContent = 'Copied!';
          setTimeout(() => {
            this.textContent = original;
          }, 1500);
        });
      }
    });
  }
}
