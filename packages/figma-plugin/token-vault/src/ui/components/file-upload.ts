/**
 * File Upload Component
 * Handles file drag-and-drop, parsing, and display
 */

import { getState, setState } from '../state';
import { updateActionButton } from './tabs';
import { formatFileSize } from '../utils/format';
import { sendMessage } from '../message-bridge';

export interface FileData {
  name: string;
  content: unknown;
  size: number;
}

export interface FileUploadOptions {
  onFilesChanged?: (files: Map<string, FileData>) => void;
  onError?: (fileName: string, error: string) => void;
}

/**
 * Initialize file upload component
 * Sets up drag-and-drop zone, file input, and event handlers
 */
export function initFileUpload(options: FileUploadOptions = {}): void {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const fileList = document.getElementById('fileList');

  if (!dropZone || !fileInput || !fileList) {
    console.error('File upload: Required elements not found');
    return;
  }

  // Click to open file picker
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag and drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files, options);
    }
  });

  // File input change handler
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      handleFiles(target.files, options);
    }
  });

  // Initial render
  renderFileList(options);
}

/**
 * Handle uploaded files - parse JSON and update state
 */
async function handleFiles(fileList: FileList, options: FileUploadOptions): Promise<void> {
  const state = getState();

  for (const file of Array.from(fileList)) {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const fileName = file.name.replace('.json', '');

        state.files.set(fileName, {
          name: fileName,
          content: data,
          size: file.size
        });

        // Check if file is baseline format
        const isBaseline = data && typeof data === 'object' && '$metadata' in data && 'baseline' in data;

        if (isBaseline) {
          // Only detect format for baseline files
          console.log('[FileUpload] Baseline file detected, sending detection request for:', fileName);
          sendMessage({
            type: 'detect-import-format',
            fileName,
            jsonData: data
          });
        } else {
          console.log('[FileUpload] Regular token file, will use flexible import for:', fileName);
        }

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        options.onError?.(file.name, errorMessage);
        showNotification(`Error parsing ${file.name}: ${errorMessage}`, 'error');
      }
    }
  }

  setState({ files: state.files });
  renderFileList(options);
  updateActionButton();
  options.onFilesChanged?.(state.files);
}

/**
 * Render the list of uploaded files with remove buttons
 */
export function renderFileList(options: FileUploadOptions = {}): void {
  const fileListEl = document.getElementById('fileList');
  if (!fileListEl) return;

  const state = getState();
  fileListEl.innerHTML = '';

  state.files.forEach((file, name) => {
    const item = document.createElement('div');
    item.className = 'file-item';

    item.innerHTML = `
      <div class="file-info">
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-size">${formatFileSize(file.size)}</span>
      </div>
      <button class="button button-ghost" data-file="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(file.name)}">✕</button>
    `;

    fileListEl.appendChild(item);

    // Attach remove handler
    const removeBtn = item.querySelector('button');
    removeBtn?.addEventListener('click', (e) => {
      const fileName = (e.target as HTMLElement).dataset.file;
      if (fileName) {
        removeFile(fileName, options);
      }
    });
  });
}

/**
 * Remove a file from the uploaded files list
 */
function removeFile(fileName: string, options: FileUploadOptions): void {
  const state = getState();
  state.files.delete(fileName);

  setState({ files: state.files });
  renderFileList(options);
  updateActionButton();
  options.onFilesChanged?.(state.files);

  // Re-render collections to update file assignments
  const renderCollectionsEvent = new CustomEvent('render-collections');
  document.dispatchEvent(renderCollectionsEvent);
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show notification (placeholder - should be implemented elsewhere)
 */
function showNotification(message: string, type: 'error' | 'success' | 'info'): void {
  console[type === 'error' ? 'error' : 'log'](message);
  // TODO: Implement proper notification UI
}
