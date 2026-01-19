/**
 * Comparison Component
 * Feature comparison table between Synkio and alternatives
 */

import { icons } from '../shared/icons';

// Helper to create icon element
function createIconElement(name: keyof typeof icons, size: number = 24): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = icons[name];
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  if (size !== 24) {
    const svg = span.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
    }
  }
  return span;
}
import styles from './Comparison.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface ComparisonRow {
  feature: string;
  synkio: boolean | string;
  enterprise: boolean | string;
  tokensStudio: boolean | string;
  zeroheight: boolean | string;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'Figma variables sync',
    synkio: true,
    enterprise: true,
    tokensStudio: true,
    zeroheight: true,
  },
  {
    feature: 'CLI / local workflow',
    synkio: true,
    enterprise: false,
    tokensStudio: 'Git only',
    zeroheight: false,
  },
  {
    feature: 'Breaking change detection',
    synkio: true,
    enterprise: false,
    tokensStudio: false,
    zeroheight: false,
  },
  {
    feature: 'Bidirectional sync',
    synkio: true,
    enterprise: false,
    tokensStudio: 'Pro',
    zeroheight: false,
  },
  {
    feature: 'W3C DTCG format',
    synkio: true,
    enterprise: 'Partial',
    tokensStudio: true,
    zeroheight: true,
  },
  {
    feature: 'Documentation site',
    synkio: true,
    enterprise: false,
    tokensStudio: false,
    zeroheight: true,
  },
  {
    feature: 'Requires Enterprise plan',
    synkio: false,
    enterprise: true,
    tokensStudio: false,
    zeroheight: false,
  },
  {
    feature: 'Cost',
    synkio: 'Free',
    enterprise: '$75/seat/mo',
    tokensStudio: '€39/user/mo',
    zeroheight: '$59/editor/mo',
  },
];

function createCell(value: boolean | string, isHighlight: boolean = false): HTMLElement {
  const cell = document.createElement('td');
  cell.className = [getStyle('cell'), isHighlight ? getStyle('highlightCell') : ''].filter(Boolean).join(' ');

  if (typeof value === 'boolean') {
    const iconName = value ? 'check' : 'x';
    const icon = createIconElement(iconName, 20);
    icon.className = value ? getStyle('checkIcon') : getStyle('xIcon');
    cell.appendChild(icon);
  } else {
    cell.textContent = value;
    // Add special styling for price emphasis
    if (value === 'Free') {
      const freeClass = getStyle('freeText');
      if (freeClass) cell.classList.add(freeClass);
    } else if (value === '$$$' || value === '$75/seat') {
      const expensiveClass = getStyle('expensiveText');
      if (expensiveClass) cell.classList.add(expensiveClass);
    }
  }

  return cell;
}

function createHeaderCell(text: string, isHighlight: boolean = false): HTMLElement {
  const th = document.createElement('th');
  th.className = [getStyle('headerCell'), isHighlight ? getStyle('highlightHeader') : ''].filter(Boolean).join(' ');
  th.textContent = text;
  return th;
}

export function Comparison(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');
  section.id = 'comparison';

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Comparison';

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'How we stack up.';

  header.appendChild(title);
  header.appendChild(subtitle);

  // Table wrapper for horizontal scroll on mobile
  const tableWrapper = document.createElement('div');
  tableWrapper.className = getStyle('tableWrapper');

  // Table
  const table = document.createElement('table');
  table.className = getStyle('table');

  // Column group for explicit widths
  const colgroup = document.createElement('colgroup');
  const colFeature = document.createElement('col');
  colFeature.className = getStyle('colFeature');
  colgroup.appendChild(colFeature);

  // Add 4 comparison columns with equal width
  for (let i = 0; i < 4; i++) {
    const col = document.createElement('col');
    col.className = getStyle('colCompare');
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);

  // Table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  headerRow.appendChild(createHeaderCell('Feature'));
  headerRow.appendChild(createHeaderCell('Synkio', true));
  headerRow.appendChild(createHeaderCell('Figma Enterprise'));
  headerRow.appendChild(createHeaderCell('Tokens Studio'));
  headerRow.appendChild(createHeaderCell('Zeroheight'));

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');

  comparisonData.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = getStyle('row');

    const featureCell = document.createElement('td');
    featureCell.className = getStyle('featureCell');
    featureCell.textContent = row.feature;

    tr.appendChild(featureCell);
    tr.appendChild(createCell(row.synkio, true));
    tr.appendChild(createCell(row.enterprise));
    tr.appendChild(createCell(row.tokensStudio));
    tr.appendChild(createCell(row.zeroheight));

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);

  container.appendChild(header);
  container.appendChild(tableWrapper);
  section.appendChild(container);

  return section;
}
