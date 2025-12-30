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
}

export function Input(props: InputProps): HTMLDivElement {
  const { label, placeholder, value = '', type = 'text', onChange } = props;

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
    input.addEventListener('input', () => onChange(input.value));
  }

  group.appendChild(input);
  return group;
}
