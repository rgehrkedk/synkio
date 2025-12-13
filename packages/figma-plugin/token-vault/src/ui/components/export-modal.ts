/**
 * Export Modal Component
 *
 * Displays a modal with exported JSON data and copy-to-clipboard functionality.
 * Used for exporting baseline snapshots.
 */

/**
 * Shows the export modal with JSON data
 * @param data - The data to export as JSON
 */
export function showExportModal(data: unknown): void {
  const json = JSON.stringify(data, null, 2);

  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;';

  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = 'background: var(--figma-color-bg); border-radius: 8px; padding: 16px; max-width: 100%; width: 100%; max-height: 90vh; display: flex; flex-direction: column;';

  content.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">Export Complete</div>
    <div style="font-size: 10px; color: var(--figma-color-text-secondary); margin-bottom: 12px;">
      Copy the JSON below and save as baseline-snapshot.json
    </div>
    <textarea readonly style="flex: 1; min-height: 300px; font-family: monospace; font-size: 10px; padding: 8px; border: 1px solid var(--figma-color-border); border-radius: 4px; resize: none; background: var(--figma-color-bg-secondary); color: var(--figma-color-text);">${json}</textarea>
    <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
      <button class="button button-secondary" id="copyBtn">Copy to Clipboard</button>
      <button class="button button-primary" id="closeModalBtn">Close</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  const textarea = content.querySelector('textarea') as HTMLTextAreaElement;

  // Copy button handler
  const copyBtn = content.querySelector('#copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      textarea.select();
      document.execCommand('copy');
      // Note: showNotification should be imported from a notification module
      // For now, using a simple approach
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    });
  }

  // Close button handler
  const closeModalBtn = content.querySelector('#closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}
