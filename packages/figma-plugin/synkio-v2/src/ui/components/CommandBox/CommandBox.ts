import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './CommandBox.css';

registerCSS('command-box', css);

export interface CommandBoxProps {
  command: string;
}

/**
 * Copy text to clipboard using fallback for Figma plugin sandbox
 */
function copyToClipboard(text: string): Promise<void> {
  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback: create a temporary textarea and use execCommand
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}

export function CommandBox(props: CommandBoxProps): HTMLDivElement {
  const { command } = props;
  const box = el('div', { class: 'command-box' });
  box.appendChild(el('span', { class: 'command-box__text' }, command));

  const copyBtn = el('button', { class: 'command-box__copy', 'aria-label': 'Copy command' });
  copyBtn.appendChild(Icon('copy', 'sm'));
  copyBtn.addEventListener('click', async () => {
    try {
      await copyToClipboard(command);
      copyBtn.innerHTML = '';
      copyBtn.appendChild(Icon('check', 'sm'));
      copyBtn.classList.add('command-box__copy--success');
      setTimeout(() => {
        copyBtn.innerHTML = '';
        copyBtn.appendChild(Icon('copy', 'sm'));
        copyBtn.classList.remove('command-box__copy--success');
      }, 1500);
    } catch {
      // Silent fail - clipboard may not be available
    }
  });
  box.appendChild(copyBtn);
  return box;
}
