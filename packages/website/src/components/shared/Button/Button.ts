// =============================================================================
// Button Component
// Versatile button with primary, secondary, and ghost variants
// =============================================================================

import styles from './Button.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  icon?: HTMLElement;
  iconPosition?: 'left' | 'right';
}

export function Button(props: ButtonProps): HTMLElement {
  const {
    label,
    variant = 'primary',
    size = 'md',
    href,
    onClick,
    icon,
    iconPosition = 'left',
  } = props;

  // Create button or anchor element based on href
  const element = href
    ? document.createElement('a')
    : document.createElement('button');

  // Apply classes
  element.className = [
    getStyle('button'),
    getStyle(`button--${variant}`),
    getStyle(`button--${size}`),
  ].filter(Boolean).join(' ');

  // Set href for anchor elements
  if (href && element instanceof HTMLAnchorElement) {
    element.href = href;
    // Open external links in new tab
    if (href.startsWith('http')) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
  }

  // Set button type for button elements
  if (element instanceof HTMLButtonElement) {
    element.type = 'button';
  }

  // Add click handler
  if (onClick) {
    element.addEventListener('click', onClick);
  }

  // Build content
  const content = document.createElement('span');
  content.className = getStyle('button__content');

  // Add icon and label based on position
  if (icon && iconPosition === 'left') {
    const iconWrapper = document.createElement('span');
    iconWrapper.className = getStyle('button__icon');
    iconWrapper.appendChild(icon);
    content.appendChild(iconWrapper);
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = getStyle('button__label');
  labelSpan.textContent = label;
  content.appendChild(labelSpan);

  if (icon && iconPosition === 'right') {
    const iconWrapper = document.createElement('span');
    iconWrapper.className = getStyle('button__icon');
    iconWrapper.appendChild(icon);
    content.appendChild(iconWrapper);
  }

  element.appendChild(content);

  return element;
}
