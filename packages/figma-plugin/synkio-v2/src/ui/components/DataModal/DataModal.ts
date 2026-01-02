// =============================================================================
// DataModal Component - Modal for data management (Clear All Data)
// =============================================================================

import { el } from '../helpers';
import { Button } from '../Button/Button';
import { Icon } from '../../icons';

export interface DataModalProps {
  onClearData: () => void;
  onClose: () => void;
}

let modalElement: HTMLElement | null = null;

export function showDataModal(props: DataModalProps): void {
  if (modalElement) {
    closeDataModal();
  }

  modalElement = createDataModal(props);
  document.body.appendChild(modalElement);

  // Animate in
  requestAnimationFrame(() => {
    modalElement?.classList.add('modal-visible');
  });
}

export function closeDataModal(): void {
  if (modalElement) {
    modalElement.classList.remove('modal-visible');
    setTimeout(() => {
      modalElement?.remove();
      modalElement = null;
    }, 150);
  }
}

function createDataModal({ onClearData, onClose }: DataModalProps): HTMLElement {
  // Backdrop
  const backdrop = el('div', { class: 'modal-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      onClose();
    }
  });

  // Modal container
  const modal = el('div', { class: 'modal-container' });

  // Header
  const header = el('div', { class: 'modal-header' });

  const titleRow = el('div', { class: 'flex items-center gap-sm' });
  const iconWrapper = el('span', { class: 'text-error' });
  iconWrapper.appendChild(Icon('trash', 'md'));
  titleRow.appendChild(iconWrapper);
  titleRow.appendChild(el('span', { class: 'font-medium' }, 'Data Management'));
  header.appendChild(titleRow);

  const closeBtn = el('button', { class: 'modal-close', title: 'Close' });
  closeBtn.appendChild(Icon('x', 'sm'));
  closeBtn.addEventListener('click', onClose);
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // Content
  const content = el('div', { class: 'modal-content' });

  // Warning section
  const warningSection = el('div', { class: 'modal-section' });
  warningSection.appendChild(el('div', { class: 'text-sm font-medium mb-xs' }, 'Clear All Plugin Data'));
  warningSection.appendChild(el('div', { class: 'text-sm text-secondary mb-md' },
    'This will permanently remove all baselines, sync history, and settings from this Figma file. This action cannot be undone.'
  ));

  // What will be deleted list
  const deleteList = el('div', { class: 'text-xs text-tertiary mb-md' });
  deleteList.innerHTML = `
    <div class="mb-xs">This will delete:</div>
    <ul style="margin: 0; padding-left: 16px;">
      <li>Sync baseline (Figma state)</li>
      <li>Code baseline (imported state)</li>
      <li>Sync history</li>
      <li>Exclusion settings</li>
      <li>Remote source configuration</li>
    </ul>
  `;
  warningSection.appendChild(deleteList);

  warningSection.appendChild(Button({
    label: 'Clear All Data',
    variant: 'danger',
    fullWidth: true,
    onClick: () => {
      if (confirm('Are you absolutely sure? This cannot be undone.')) {
        onClearData();
        onClose();
      }
    },
  }));

  content.appendChild(warningSection);
  modal.appendChild(content);

  backdrop.appendChild(modal);
  return backdrop;
}
