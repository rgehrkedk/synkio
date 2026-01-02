import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Input.css';

registerCSS('input', css);

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'password' | 'url';
  onChange?: (value: string) => void;
  /** If true, only fire onChange on blur instead of every keystroke */
  onBlur?: boolean;
  /** Debounce delay in ms. If set, onChange fires after typing stops. */
  debounce?: number;
}

export function Input(props: InputProps): HTMLDivElement {
  const { label, placeholder, value = '', type = 'text', onChange, onBlur = false, debounce = 0 } = props;

  const group = el('div', { class: 'input-group' });

  if (label) {
    group.appendChild(el('label', { class: 'input-group__label' }, label));
  }

  const input = el('input', {
    type,
    class: 'input-group__input',
    placeholder,
  }) as HTMLInputElement;
  input.value = value;

  if (onChange) {
    if (onBlur) {
      // Only fire on blur
      input.addEventListener('blur', () => onChange(input.value));
    } else if (debounce > 0) {
      // Debounced input
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      input.addEventListener('input', () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => onChange(input.value), debounce);
      });
      // Also fire on blur to ensure value is saved
      input.addEventListener('blur', () => {
        if (timeoutId) clearTimeout(timeoutId);
        onChange(input.value);
      });
    } else {
      // Immediate (default)
      input.addEventListener('input', () => onChange(input.value));
    }
  }

  group.appendChild(input);
  return group;
}
