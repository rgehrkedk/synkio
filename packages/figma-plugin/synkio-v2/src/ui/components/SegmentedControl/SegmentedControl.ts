// =============================================================================
// SegmentedControl Component
// Figma-native segmented control / tab bar
// =============================================================================

import { el } from '../helpers';
import { registerCSS } from '../../styles/index';
import css from './SegmentedControl.css';

registerCSS('SegmentedControl', css);

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: HTMLElement | SVGElement; // Optional icon element
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string = string>(
  props: SegmentedControlProps<T>
): HTMLElement {
  const { options, value, onChange } = props;

  const container = el('div', { class: 'segmented-control', role: 'tablist' });

  for (const option of options) {
    const isActive = option.value === value;
    const button = el('button', {
      class: `segmented-control__item${isActive ? ' segmented-control__item--active' : ''}`,
      role: 'tab',
      'aria-selected': isActive ? 'true' : 'false',
      type: 'button',
    });

    // Add icon if provided
    if (option.icon) {
      button.appendChild(option.icon);
    }

    // Add label
    button.appendChild(document.createTextNode(option.label));

    button.addEventListener('click', () => {
      if (option.value !== value) {
        onChange(option.value);
      }
    });

    container.appendChild(button);
  }

  return container;
}
