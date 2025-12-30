import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Checkbox.css';

registerCSS('checkbox', css);

export interface CheckboxProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

export function Checkbox(props: CheckboxProps): HTMLLabelElement {
  const { label, sublabel, checked, onChange } = props;

  const container = el('label', { class: 'checkbox' });

  const input = el('input', { type: 'checkbox', class: 'checkbox__input' }) as HTMLInputElement;
  input.checked = checked;
  if (onChange) {
    input.addEventListener('change', () => onChange(input.checked));
  }
  container.appendChild(input);

  const content = el('div', { class: 'checkbox__content' });
  content.appendChild(el('span', { class: 'checkbox__label' }, label));
  if (sublabel) {
    content.appendChild(el('span', { class: 'checkbox__sublabel' }, sublabel));
  }
  container.appendChild(content);

  return container;
}
