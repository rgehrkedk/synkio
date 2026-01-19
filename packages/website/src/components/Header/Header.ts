/**
 * Header Component
 * Fixed header with navigation, logo, and theme toggle
 */

import { SynkioLogo } from '../shared/SynkioLogo';
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

  const logoElement = SynkioLogo({ animated: false, size: 'xs', layout: 'inline' });
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

  // Add scroll listener to toggle 'scrolled' class and reveal header logo
  // The header logo should only appear after scrolling past the hero logo
  let heroLogoBottom: number | null = null;

  const updateHeroLogoPosition = () => {
    const heroLogo = document.querySelector('[data-hero-logo]');
    if (heroLogo) {
      const rect = heroLogo.getBoundingClientRect();
      // Calculate the absolute position of the hero logo's bottom from the top of the document
      heroLogoBottom = window.scrollY + rect.bottom;
    }
  };

  const handleScroll = () => {
    // Recalculate hero logo position if not yet determined
    if (heroLogoBottom === null) {
      updateHeroLogoPosition();
    }

    const scrollThreshold = heroLogoBottom ?? 200; // Fallback to 200px
    const isPastHeroLogo = window.scrollY > scrollThreshold;

    if (isPastHeroLogo) {
      header.classList.add(getStyle('scrolled'));
      logoLink.classList.add(getStyle('logoVisible'));
    } else {
      header.classList.remove(getStyle('scrolled'));
      logoLink.classList.remove(getStyle('logoVisible'));
    }
  };

  // Calculate hero logo position after page has rendered
  requestAnimationFrame(() => {
    updateHeroLogoPosition();
    handleScroll();
  });

  // Recalculate on resize (hero logo position may change)
  window.addEventListener('resize', () => {
    heroLogoBottom = null;
    updateHeroLogoPosition();
    handleScroll();
  }, { passive: true });

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
