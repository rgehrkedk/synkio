/**
 * Export Modal Component
 *
 * Displays a modal with exported JSON data and download/copy functionality.
 * Used for exporting baseline snapshots.
 */

/**
 * Shows the export modal with JSON data
 * @param data - The data to export as JSON
 */
export function showExportModal(data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  
  // Get filename from metadata if available
  const metadata = (data as any)?.$metadata;
  const version = metadata?.version || '1.0.0';
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `baseline-snapshot-v${version}-${timestamp}.json`;

  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;';

  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = 'background: var(--figma-color-bg); border-radius: 8px; padding: 16px; max-width: 100%; width: 100%; max-height: 90vh; display: flex; flex-direction: column;';

  content.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
      <span style="color: var(--figma-color-icon-success, #1e8e3e);">✓</span>
      Export Complete
    </div>
    <div style="font-size: 11px; color: var(--figma-color-text-secondary); margin-bottom: 12px;">
      Download the JSON file or copy to clipboard.
    </div>
    
    <div style="background: var(--figma-color-bg-secondary); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 11px; font-weight: 500;">📄 ${filename}</span>
        <span style="font-size: 10px; color: var(--figma-color-text-tertiary);">${formatBytes(json.length)}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="button button-primary" id="downloadBtn" style="flex: 1;">
          ⬇ Download JSON
        </button>
        <button class="button button-secondary" id="copyBtn" style="flex: 1;">
          📋 Copy to Clipboard
        </button>
      </div>
    </div>
    
    <div style="font-size: 10px; color: var(--figma-color-text-tertiary); margin-bottom: 8px;">Preview:</div>
    <textarea readonly style="flex: 1; min-height: 200px; font-family: 'SF Mono', Monaco, monospace; font-size: 10px; padding: 8px; border: 1px solid var(--figma-color-border); border-radius: 4px; resize: none; background: var(--figma-color-bg-secondary); color: var(--figma-color-text);">${escapeHtml(json.slice(0, 5000))}${json.length > 5000 ? '\n\n... (truncated preview)' : ''}</textarea>
    
    <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
      <button class="button button-secondary" id="closeModalBtn">Close</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Download button handler
  const downloadBtn = content.querySelector('#downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadFile(json, filename);
      const originalText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '✓ Downloaded!';
      setTimeout(() => {
        downloadBtn.innerHTML = originalText;
      }, 1500);
    });
  }

  // Copy button handler
  const copyBtn = content.querySelector('#copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyToClipboard(json);
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
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

/**
 * Download a string as a file
 */
function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text: string): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
