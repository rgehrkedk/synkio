export function Footer(children: HTMLElement[]): HTMLElement {
  const footer = document.createElement('div');
  footer.className = 'footer';
  for (const child of children) {
    footer.appendChild(child);
  }
  return footer;
}
