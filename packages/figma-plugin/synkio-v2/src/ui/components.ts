// =============================================================================
// UI Component Library
// Lightweight, framework-free component system for Figma plugin UI
// =============================================================================

// =============================================================================
// Core Helpers
// =============================================================================

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | undefined>,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === false) continue;
      if (value === true) {
        element.setAttribute(key, '');
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

export function text(content: string): Text {
  return document.createTextNode(content);
}

export function clear(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function show(element: HTMLElement): void {
  element.style.display = '';
}

export function hide(element: HTMLElement): void {
  element.style.display = 'none';
}

// =============================================================================
// Button Component
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  onClick?: () => void;
}

const buttonStyles = `
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-family);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn--sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    height: 28px;
  }
  .btn--md {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    height: 32px;
  }
  .btn--lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-md);
    height: 40px;
  }
  .btn--full {
    width: 100%;
  }
  .btn--primary {
    background: var(--color-primary);
    color: white;
  }
  .btn--primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn--secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }
  .btn--secondary:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
  }
  .btn--ghost {
    background: transparent;
    color: var(--color-text-secondary);
  }
  .btn--ghost:hover:not(:disabled) {
    background: var(--color-bg-secondary);
    color: var(--color-text);
  }
  .btn--danger {
    background: var(--color-error);
    color: white;
  }
  .btn--danger:hover:not(:disabled) {
    background: #dc2626;
  }
`;

export function Button(props: ButtonProps): HTMLButtonElement {
  const { label, variant = 'primary', size = 'md', disabled = false, fullWidth = false, icon, onClick } = props;

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
  ].filter(Boolean).join(' ');

  const btn = el('button', { class: classes, disabled: disabled || undefined });

  if (icon) {
    btn.appendChild(el('span', { class: 'btn-icon' }, icon));
  }
  btn.appendChild(text(label));

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}

// =============================================================================
// Card Component
// =============================================================================

export interface CardProps {
  children?: (Node | string)[];
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

const cardStyles = `
  .card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  .card--clickable {
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .card--clickable:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-sm);
  }
  .card--pad-none { padding: 0; }
  .card--pad-sm { padding: var(--spacing-sm); }
  .card--pad-md { padding: var(--spacing-md); }
  .card--pad-lg { padding: var(--spacing-lg); }
`;

export function Card(props: CardProps): HTMLDivElement {
  const { children = [], padding = 'md', clickable = false, onClick } = props;

  const classes = [
    'card',
    `card--pad-${padding}`,
    clickable ? 'card--clickable' : '',
  ].filter(Boolean).join(' ');

  const card = el('div', { class: classes });

  for (const child of children) {
    if (typeof child === 'string') {
      card.appendChild(text(child));
    } else {
      card.appendChild(child);
    }
  }

  if (onClick) {
    card.addEventListener('click', onClick);
  }

  return card;
}

// =============================================================================
// Section Component
// =============================================================================

export interface SectionProps {
  title?: string;
  count?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children?: (Node | string)[];
}

const sectionStyles = `
  .section {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    font-weight: 500;
    font-size: var(--font-size-sm);
  }
  .section__header--clickable {
    cursor: pointer;
  }
  .section__header--clickable:hover {
    background: var(--color-bg-tertiary);
  }
  .section__title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .section__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--color-bg-tertiary);
    border-radius: 10px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
  .section__chevron {
    color: var(--color-text-tertiary);
    transition: transform 0.2s ease;
  }
  .section__chevron--collapsed {
    transform: rotate(-90deg);
  }
  .section__content {
    padding: var(--spacing-md);
  }
  .section__content--collapsed {
    display: none;
  }
`;

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
      chevron = el('span', { class: 'section__chevron' }, '\u25BC');
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

// =============================================================================
// DiffItem Component
// =============================================================================

export type DiffType = 'added' | 'modified' | 'deleted' | 'renamed';

export interface DiffItemProps {
  type: DiffType;
  path: string;
  oldPath?: string;
  value?: string;
  oldValue?: string;
  colorPreview?: string;
}

const diffItemStyles = `
  .diff-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border);
  }
  .diff-item:last-child {
    border-bottom: none;
  }
  .diff-item__header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .diff-item__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }
  .diff-item__icon--added {
    background: color-mix(in srgb, var(--color-added) 15%, transparent);
    color: var(--color-added);
  }
  .diff-item__icon--modified {
    background: color-mix(in srgb, var(--color-modified) 15%, transparent);
    color: var(--color-modified);
  }
  .diff-item__icon--deleted {
    background: color-mix(in srgb, var(--color-deleted) 15%, transparent);
    color: var(--color-deleted);
  }
  .diff-item__icon--renamed {
    background: color-mix(in srgb, var(--color-renamed) 15%, transparent);
    color: var(--color-renamed);
  }
  .diff-item__path {
    font-family: 'SF Mono', Menlo, monospace;
    font-size: var(--font-size-xs);
    color: var(--color-text);
    word-break: break-all;
  }
  .diff-item__old-path {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
  }
  .diff-item__arrow {
    color: var(--color-text-tertiary);
    margin: 0 var(--spacing-xs);
  }
  .diff-item__value {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding-left: 26px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
  .diff-item__color-preview {
    width: 14px;
    height: 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .diff-item__value-change {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .diff-item__old-value {
    color: var(--color-text-tertiary);
    text-decoration: line-through;
  }
`;

export function DiffItem(props: DiffItemProps): HTMLDivElement {
  const { type, path, oldPath, value, oldValue, colorPreview } = props;

  const item = el('div', { class: 'diff-item' });

  // Header with icon and path
  const header = el('div', { class: 'diff-item__header' });

  const iconMap: Record<DiffType, string> = {
    added: '+',
    modified: '~',
    deleted: '-',
    renamed: '\u2194',
  };

  const icon = el('span', { class: `diff-item__icon diff-item__icon--${type}` }, iconMap[type]);
  header.appendChild(icon);

  if (type === 'renamed' && oldPath) {
    header.appendChild(el('span', { class: 'diff-item__path diff-item__old-path' }, oldPath));
    header.appendChild(el('span', { class: 'diff-item__arrow' }, '\u2192'));
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
      changeEl.appendChild(el('span', { class: 'diff-item__arrow' }, '\u2192'));
      changeEl.appendChild(el('span', {}, value || ''));
      valueEl.appendChild(changeEl);
    } else if (value) {
      valueEl.appendChild(text(value));
    }

    item.appendChild(valueEl);
  }

  return item;
}

// =============================================================================
// Checkbox Component
// =============================================================================

export interface CheckboxProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

const checkboxStyles = `
  .checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    cursor: pointer;
    user-select: none;
  }
  .checkbox__input {
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
    accent-color: var(--color-primary);
  }
  .checkbox__content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .checkbox__label {
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }
  .checkbox__sublabel {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }
`;

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

// =============================================================================
// Input Component
// =============================================================================

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'password' | 'url';
  onChange?: (value: string) => void;
}

const inputStyles = `
  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .input-group__label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
  .input-group__input {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    background: var(--color-bg);
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }
  .input-group__input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  .input-group__input::placeholder {
    color: var(--color-text-tertiary);
  }
`;

export function Input(props: InputProps): HTMLDivElement {
  const { label, placeholder, value = '', type = 'text', onChange } = props;

  const group = el('div', { class: 'input-group' });

  if (label) {
    group.appendChild(el('label', { class: 'input-group__label' }, label));
  }

  const input = el('input', {
    type,
    class: 'input-group__input',
    placeholder,
  }) as HTMLInputElement;
  input.value = value;

  if (onChange) {
    input.addEventListener('input', () => onChange(input.value));
  }

  group.appendChild(input);
  return group;
}

// =============================================================================
// Status Indicator Component
// =============================================================================

export type StatusType = 'success' | 'warning' | 'error' | 'neutral';

export interface StatusIndicatorProps {
  type: StatusType;
  label: string;
}

const statusIndicatorStyles = `
  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }
  .status-indicator__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .status-indicator__dot--success { background: var(--color-success); }
  .status-indicator__dot--warning { background: var(--color-warning); }
  .status-indicator__dot--error { background: var(--color-error); }
  .status-indicator__dot--neutral { background: var(--color-text-tertiary); }
`;

export function StatusIndicator(props: StatusIndicatorProps): HTMLSpanElement {
  const { type, label } = props;

  const indicator = el('span', { class: 'status-indicator' });
  indicator.appendChild(el('span', { class: `status-indicator__dot status-indicator__dot--${type}` }));
  indicator.appendChild(text(label));

  return indicator;
}

// =============================================================================
// Loading Spinner Component
// =============================================================================

const spinnerStyles = `
  .spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl);
  }
  .spinner__icon {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinner__message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
`;

export function Spinner(message?: string): HTMLDivElement {
  const spinner = el('div', { class: 'spinner' });
  spinner.appendChild(el('div', { class: 'spinner__icon' }));
  if (message) {
    spinner.appendChild(el('div', { class: 'spinner__message' }, message));
  }
  return spinner;
}

// =============================================================================
// Empty State Component
// =============================================================================

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const emptyStateStyles = `
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl);
    text-align: center;
  }
  .empty-state__icon {
    font-size: 32px;
    color: var(--color-text-tertiary);
  }
  .empty-state__title {
    font-size: var(--font-size-lg);
    font-weight: 500;
    color: var(--color-text);
  }
  .empty-state__description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    max-width: 280px;
  }
`;

export function EmptyState(props: EmptyStateProps): HTMLDivElement {
  const { icon, title, description, action } = props;

  const empty = el('div', { class: 'empty-state' });

  if (icon) {
    empty.appendChild(el('div', { class: 'empty-state__icon' }, icon));
  }
  empty.appendChild(el('div', { class: 'empty-state__title' }, title));
  if (description) {
    empty.appendChild(el('div', { class: 'empty-state__description' }, description));
  }
  if (action) {
    empty.appendChild(Button({ label: action.label, onClick: action.onClick }));
  }

  return empty;
}

// =============================================================================
// Alert/Banner Component
// =============================================================================

export interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
}

const alertStyles = `
  .alert {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }
  .alert--info {
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
  .alert--warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
  }
  .alert--error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
  }
  .alert--success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  }
  .alert__icon {
    flex-shrink: 0;
  }
  .alert__content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .alert__title {
    font-weight: 500;
  }
  .alert__message {
    color: var(--color-text-secondary);
  }
`;

export function Alert(props: AlertProps): HTMLDivElement {
  const { type, title, message } = props;

  const iconMap: Record<string, string> = {
    info: '\u2139',
    warning: '\u26A0',
    error: '\u2715',
    success: '\u2713',
  };

  const alert = el('div', { class: `alert alert--${type}` });
  alert.appendChild(el('span', { class: 'alert__icon' }, iconMap[type]));

  const content = el('div', { class: 'alert__content' });
  if (title) {
    content.appendChild(el('span', { class: 'alert__title' }, title));
  }
  content.appendChild(el('span', { class: 'alert__message' }, message));
  alert.appendChild(content);

  return alert;
}

// =============================================================================
// Header Component
// =============================================================================

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: HTMLElement;
}

const headerStyles = `
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header__left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .header__back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    transition: background 0.15s ease;
  }
  .header__back:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text);
  }
  .header__title {
    font-size: var(--font-size-lg);
    font-weight: 600;
  }
  .header__right {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
`;

export function Header(props: HeaderProps): HTMLElement {
  const { title, showBack = false, onBack, rightAction } = props;

  const header = el('header', { class: 'header' });

  const left = el('div', { class: 'header__left' });
  if (showBack) {
    const backBtn = el('button', { class: 'header__back' }, '\u2190');
    if (onBack) {
      backBtn.addEventListener('click', onBack);
    }
    left.appendChild(backBtn);
  }
  left.appendChild(el('span', { class: 'header__title' }, title));
  header.appendChild(left);

  if (rightAction) {
    const right = el('div', { class: 'header__right' });
    right.appendChild(rightAction);
    header.appendChild(right);
  }

  return header;
}

// =============================================================================
// Inject All Styles
// =============================================================================

export function injectStyles(): void {
  const allStyles = [
    buttonStyles,
    cardStyles,
    sectionStyles,
    diffItemStyles,
    checkboxStyles,
    inputStyles,
    statusIndicatorStyles,
    spinnerStyles,
    emptyStateStyles,
    alertStyles,
    headerStyles,
  ].join('\n');

  const style = document.createElement('style');
  style.textContent = allStyles;
  document.head.appendChild(style);
}
