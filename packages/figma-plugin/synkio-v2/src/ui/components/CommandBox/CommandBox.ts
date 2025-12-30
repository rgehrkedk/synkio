import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './CommandBox.css';

registerCSS('command-box', css);

export interface CommandBoxProps {
  command: string;
}

export function CommandBox(props: CommandBoxProps): HTMLDivElement {
  const { command } = props;
  const box = el('div', { class: 'command-box' });
  box.appendChild(el('span', { class: 'command-box__text' }, command));

  const copyBtn = el('button', { class: 'command-box__copy', 'aria-label': 'Copy command' });
  copyBtn.appendChild(Icon('copy', 'sm'));
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(command);
    copyBtn.innerHTML = '';
    copyBtn.appendChild(Icon('check', 'sm'));
    copyBtn.classList.add('command-box__copy--success');
    setTimeout(() => {
      copyBtn.innerHTML = '';
      copyBtn.appendChild(Icon('copy', 'sm'));
      copyBtn.classList.remove('command-box__copy--success');
    }, 1500);
  });
  box.appendChild(copyBtn);
  return box;
}
