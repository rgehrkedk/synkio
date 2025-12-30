import { registerCSS } from '../styles';
import css from './layout.css';

registerCSS('layout', css);

export function PageLayout(children: HTMLElement[]): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';
  for (const child of children) {
    page.appendChild(child);
  }
  return page;
}
