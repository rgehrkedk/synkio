import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './Header.css';

registerCSS('header', css);

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: HTMLElement;
}

export function Header(props: HeaderProps): HTMLElement {
  const { title, showBack = false, onBack, rightAction } = props;

  const header = el('header', { class: 'header' });

  const left = el('div', { class: 'header__left' });
  if (showBack) {
    const backBtn = el('button', { class: 'header__back' });
    backBtn.appendChild(Icon('chevron-left', 'md'));
    if (onBack) {
      backBtn.addEventListener('click', onBack);
    }
    left.appendChild(backBtn);
  }
  left.appendChild(el('span', { class: 'header__title' }, title));
  header.appendChild(left);

  if (rightAction) {
    const right = el('div', { class: 'header__right' });
    right.appendChild(rightAction);
    header.appendChild(right);
  }

  return header;
}
