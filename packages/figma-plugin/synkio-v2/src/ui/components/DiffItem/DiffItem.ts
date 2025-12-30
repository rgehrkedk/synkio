// =============================================================================
// DiffItem Component
// =============================================================================

import { el, text } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon, DiffIcon } from '../../icons';
import css from './DiffItem.css';

registerCSS('diff-item', css);

export type DiffType = 'added' | 'modified' | 'deleted' | 'renamed';

export interface DiffItemProps {
  type: DiffType;
  path: string;
  oldPath?: string;
  value?: string;
  oldValue?: string;
  colorPreview?: string;
}

export function DiffItem(props: DiffItemProps): HTMLDivElement {
  const { type, path, oldPath, value, oldValue, colorPreview } = props;

  const item = el('div', { class: 'diff-item' });

  // Header with icon and path
  const header = el('div', { class: 'diff-item__header' });

  const iconWrapper = el('span', { class: `diff-item__icon diff-item__icon--${type}` });
  iconWrapper.appendChild(DiffIcon(type, 'xs'));
  header.appendChild(iconWrapper);

  if (type === 'renamed' && oldPath) {
    header.appendChild(el('span', { class: 'diff-item__path diff-item__old-path' }, oldPath));
    const arrowEl = el('span', { class: 'diff-item__arrow' });
    arrowEl.appendChild(Icon('arrow-right', 'xs'));
    header.appendChild(arrowEl);
    header.appendChild(el('span', { class: 'diff-item__path' }, path));
  } else {
    header.appendChild(el('span', { class: 'diff-item__path' }, path));
  }

  item.appendChild(header);

  // Value display
  if (value || colorPreview) {
    const valueEl = el('div', { class: 'diff-item__value' });

    if (colorPreview) {
      const colorBox = el('span', { class: 'diff-item__color-preview' });
      colorBox.style.backgroundColor = colorPreview;
      valueEl.appendChild(colorBox);
    }

    if (type === 'modified' && oldValue) {
      const changeEl = el('div', { class: 'diff-item__value-change' });
      changeEl.appendChild(el('span', { class: 'diff-item__old-value' }, oldValue));
      const arrowEl = el('span', { class: 'diff-item__arrow' });
      arrowEl.appendChild(Icon('arrow-right', 'xs'));
      changeEl.appendChild(arrowEl);
      changeEl.appendChild(el('span', {}, value || ''));
      valueEl.appendChild(changeEl);
    } else if (value) {
      valueEl.appendChild(text(value));
    }

    item.appendChild(valueEl);
  }

  return item;
}
