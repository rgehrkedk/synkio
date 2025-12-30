import { el, text } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './Section.css';

registerCSS('section', css);

export interface SectionProps {
  title?: string;
  count?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children?: (Node | string)[];
}

export function Section(props: SectionProps): HTMLDivElement {
  const { title, count, collapsible = false, defaultExpanded = true, children = [] } = props;

  let isExpanded = defaultExpanded;

  const section = el('div', { class: 'section' });

  if (title) {
    const headerClasses = ['section__header', collapsible ? 'section__header--clickable' : ''].filter(Boolean).join(' ');
    const header = el('div', { class: headerClasses });

    const titleEl = el('div', { class: 'section__title' });
    titleEl.appendChild(text(title));
    if (count !== undefined) {
      titleEl.appendChild(el('span', { class: 'section__count' }, String(count)));
    }
    header.appendChild(titleEl);

    let chevron: HTMLSpanElement | null = null;
    if (collapsible) {
      chevron = el('span', { class: 'section__chevron' });
      chevron.appendChild(Icon('chevron-down', 'sm'));
      if (!isExpanded) {
        chevron.classList.add('section__chevron--collapsed');
      }
      header.appendChild(chevron);
    }

    section.appendChild(header);

    const content = el('div', { class: 'section__content' });
    if (!isExpanded) {
      content.classList.add('section__content--collapsed');
    }

    for (const child of children) {
      if (typeof child === 'string') {
        content.appendChild(text(child));
      } else {
        content.appendChild(child);
      }
    }

    section.appendChild(content);

    if (collapsible) {
      header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
          content.classList.remove('section__content--collapsed');
          chevron?.classList.remove('section__chevron--collapsed');
        } else {
          content.classList.add('section__content--collapsed');
          chevron?.classList.add('section__chevron--collapsed');
        }
      });
    }
  } else {
    const content = el('div', { class: 'section__content' });
    for (const child of children) {
      if (typeof child === 'string') {
        content.appendChild(text(child));
      } else {
        content.appendChild(child);
      }
    }
    section.appendChild(content);
  }

  return section;
}
