/**
 * Synkio Website
 * Main entry point
 */

// Import styles - Vite handles these
import '../build/tokens.css';
import './styles/global.css';

import {
  Header,
  Hero,
  Workflow,
  Features,
  Comparison,
  QuickStart,
  Footer,
} from './components';

/**
 * Initialize the website
 */
function init(): void {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  // Apply saved theme preference
  const savedTheme = localStorage.getItem('synkio-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Build the page - all sections in order
  root.appendChild(Header());
  root.appendChild(Hero());
  root.appendChild(Workflow());
  root.appendChild(Features());
  root.appendChild(Comparison());
  root.appendChild(QuickStart());
  root.appendChild(Footer());

  console.log('Synkio website loaded');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
