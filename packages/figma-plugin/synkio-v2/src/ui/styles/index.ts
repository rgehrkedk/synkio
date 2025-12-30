// =============================================================================
// CSS Injection Utility
// =============================================================================

// Import base styles
import baseCSS from './base.css';
import utilitiesCSS from './utilities.css';

const registered = new Set<string>();

/**
 * Register and inject CSS for a component.
 * Ensures each component's CSS is only injected once.
 */
export function registerCSS(id: string, css: string): void {
  if (registered.has(id)) return;
  registered.add(id);

  const style = document.createElement('style');
  style.setAttribute('data-component', id);
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Inject base and utility styles.
 * Should be called once at app initialization.
 */
export function injectStyles(): void {
  registerCSS('base', baseCSS);
  registerCSS('utilities', utilitiesCSS);
}
