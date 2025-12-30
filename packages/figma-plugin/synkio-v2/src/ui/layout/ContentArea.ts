export function ContentArea(children: HTMLElement[]): HTMLElement {
  const content = document.createElement('div');
  content.className = 'content';
  for (const child of children) {
    content.appendChild(child);
  }
  return content;
}
