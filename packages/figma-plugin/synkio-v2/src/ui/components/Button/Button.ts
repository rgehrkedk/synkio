import { el, text } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Button.css';

registerCSS('button', css);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  onClick?: () => void;
}

export function Button(props: ButtonProps): HTMLButtonElement {
  const { label, variant = 'primary', size = 'md', disabled = false, fullWidth = false, icon, onClick } = props;

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
  ].filter(Boolean).join(' ');

  const btn = el('button', { class: classes, disabled: disabled || undefined });

  if (icon) {
    btn.appendChild(el('span', { class: 'btn-icon' }, icon));
  }
  btn.appendChild(text(label));

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
