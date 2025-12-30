export function Row(children: HTMLElement[], gap: string = 'var(--spacing-md)'): HTMLElement {
  const row = document.createElement('div');
  row.className = 'row';
  row.style.gap = gap;
  for (const child of children) {
    row.appendChild(child);
  }
  return row;
}
