import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon, IconName } from '../../icons';
import css from './IconButton.css';

registerCSS('icon-button', css);

export interface IconButtonProps {
  icon: IconName;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
  onClick?: () => void;
  ariaLabel?: string;
}

export function IconButton(props: IconButtonProps): HTMLButtonElement {
  const { icon, size = 'md', variant = 'ghost', onClick, ariaLabel } = props;
  const btn = el('button', {
    class: `icon-btn icon-btn--${size} icon-btn--${variant}`,
    'aria-label': ariaLabel
  });
  btn.appendChild(Icon(icon, size === 'sm' ? 'sm' : 'md'));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
