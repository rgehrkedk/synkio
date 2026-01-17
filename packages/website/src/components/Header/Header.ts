/**
 * Header Component
 * Fixed header with navigation, logo, and theme toggle
 */

import { LetterLogo } from '../shared/LetterLogo';
import { createIcon } from '../shared/icons';
import styles from './Header.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface NavLink {
  label: string;
  href: string;
  icon?: keyof typeof import('../shared/icons').icons;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Docs', href: '/docs', icon: 'externalLink' },
  { label: 'GitHub', href: 'https://github.com/rgehrkedk/synkio', icon: 'github', external: true },
  { label: 'npm', href: 'https://www.npmjs.com/package/synkio', icon: 'npm', external: true },
];

export function Header(): HTMLElement {
  const header = document.createElement('header');
  header.className = getStyle('header');

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Logo section
  const logoLink = document.createElement('a');
  logoLink.href = '/';
  logoLink.className = getStyle('logo');
  logoLink.setAttribute('aria-label', 'Synkio home');

  const logoElement = LetterLogo({ animated: false, size: 'md' });
  logoLink.appendChild(logoElement);

  const logoText = document.createElement('span');
  logoText.className = getStyle('logoText');
 
  logoLink.appendChild(logoText);

  container.appendChild(logoLink);

  // Navigation section
  const nav = document.createElement('nav');
  nav.className = getStyle('nav');

  const navLinksContainer = document.createElement('div');
  navLinksContainer.className = getStyle('navLinks');

  navLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.className = getStyle('navLink');
    anchor.textContent = link.label;

    if (link.external) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    if (link.icon) {
      const icon = createIcon(link.icon);
      anchor.appendChild(icon);
    }

    navLinksContainer.appendChild(anchor);
  });

  nav.appendChild(navLinksContainer);

  // Theme toggle
  const themeToggle = createThemeToggle();
  nav.appendChild(themeToggle);

  // Mobile menu button
  const mobileMenuButton = document.createElement('button');
  mobileMenuButton.className = getStyle('mobileMenuButton');
  mobileMenuButton.setAttribute('aria-label', 'Toggle menu');
  mobileMenuButton.appendChild(createIcon('menu'));

  mobileMenuButton.addEventListener('click', () => {
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    mobileMenuButton.innerHTML = '';
    mobileMenuButton.appendChild(createIcon(isOpen ? 'close' : 'menu'));
  });

  nav.appendChild(mobileMenuButton);

  container.appendChild(nav);
  header.appendChild(container);

  // Add scroll listener to toggle 'scrolled' class
  // Show header logo when scrolled past the hero logo
  const handleScroll = () => {
    const scrollThreshold = 200; // Approximately when hero logo is out of view
    if (window.scrollY > scrollThreshold) {
      header.classList.add(getStyle('scrolled'));
    } else {
      header.classList.remove(getStyle('scrolled'));
    }
  };

  // Initial check
  handleScroll();

  // Listen for scroll
  window.addEventListener('scroll', handleScroll, { passive: true });

  return header;
}

function createThemeToggle(): HTMLElement {
  const button = document.createElement('button');
  button.className = getStyle('themeToggle');
  button.setAttribute('aria-label', 'Toggle theme');

  const sunIcon = createIcon('sun');
  const moonIcon = createIcon('moon');

  // Initially show based on current theme
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  sunIcon.style.display = isDark ? 'none' : 'block';
  moonIcon.style.display = isDark ? 'block' : 'none';

  button.appendChild(sunIcon);
  button.appendChild(moonIcon);

  button.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);

    // Toggle icon visibility
    sunIcon.style.display = newTheme === 'dark' ? 'none' : 'block';
    moonIcon.style.display = newTheme === 'dark' ? 'block' : 'none';

    // Store preference
    localStorage.setItem('synkio-theme', newTheme);
  });

  return button;
}

export default Header;
