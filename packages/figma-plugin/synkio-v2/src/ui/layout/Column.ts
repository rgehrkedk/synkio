export function Column(children: HTMLElement[], gap: string = 'var(--spacing-md)'): HTMLElement {
  const col = document.createElement('div');
  col.className = 'column';
  col.style.gap = gap;
  for (const child of children) {
    col.appendChild(child);
  }
  return col;
}
