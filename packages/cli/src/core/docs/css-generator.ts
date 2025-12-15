/**
 * CSS Generator for Documentation Site
 *
 * This module generates the CSS styling for the documentation site itself.
 * For token CSS output (tokens.css, utilities.css), use ../css/index.ts
 */

/**
 * Generate documentation site CSS
 * This creates all the styling for the docs UI - layout, typography, colors, etc.
 */
export function generateDocsCSS(): string {
  return `/* ==========================================================================
   Synkio Documentation Site Styles
   Generated documentation styles for design token visualization
   ========================================================================== */

/* --------------------------------------------------------------------------
   CSS Variables & Theming
   -------------------------------------------------------------------------- */

:root {
  /* Base Colors */
  --docs-bg-primary: #ffffff;
  --docs-bg-secondary: #f8fafc;
  --docs-bg-tertiary: #f1f5f9;
  --docs-bg-code: #1e293b;
  
  --docs-text-primary: #0f172a;
  --docs-text-secondary: #475569;
  --docs-text-tertiary: #64748b;
  --docs-text-inverse: #ffffff;
  
  --docs-border-light: #e2e8f0;
  --docs-border-medium: #cbd5e1;
  
  --docs-accent-primary: #3b82f6;
  --docs-accent-hover: #2563eb;
  --docs-accent-light: #eff6ff;
  
  --docs-success: #22c55e;
  --docs-warning: #f59e0b;
  --docs-error: #ef4444;
  
  /* Spacing */
  --docs-spacing-xs: 0.25rem;
  --docs-spacing-sm: 0.5rem;
  --docs-spacing-md: 1rem;
  --docs-spacing-lg: 1.5rem;
  --docs-spacing-xl: 2rem;
  --docs-spacing-2xl: 3rem;
  
  /* Typography */
  --docs-font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --docs-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  
  --docs-text-xs: 0.75rem;
  --docs-text-sm: 0.875rem;
  --docs-text-base: 1rem;
  --docs-text-lg: 1.125rem;
  --docs-text-xl: 1.25rem;
  --docs-text-2xl: 1.5rem;
  --docs-text-3xl: 1.875rem;
  --docs-text-4xl: 2.25rem;
  
  /* Shadows */
  --docs-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --docs-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --docs-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  /* Border Radius */
  --docs-radius-sm: 0.25rem;
  --docs-radius-md: 0.375rem;
  --docs-radius-lg: 0.5rem;
  --docs-radius-xl: 0.75rem;
  --docs-radius-full: 9999px;
  
  /* Transitions */
  --docs-transition-fast: 150ms ease;
  --docs-transition-base: 200ms ease;
  --docs-transition-slow: 300ms ease;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --docs-bg-primary: #0f172a;
    --docs-bg-secondary: #1e293b;
    --docs-bg-tertiary: #334155;
    --docs-bg-code: #0f172a;
    
    --docs-text-primary: #f8fafc;
    --docs-text-secondary: #cbd5e1;
    --docs-text-tertiary: #94a3b8;
    --docs-text-inverse: #0f172a;
    
    --docs-border-light: #334155;
    --docs-border-medium: #475569;
    
    --docs-accent-light: #1e3a5f;
  }
}

/* --------------------------------------------------------------------------
   Base Reset & Typography
   -------------------------------------------------------------------------- */

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: var(--docs-font-sans);
  font-size: var(--docs-text-base);
  line-height: 1.6;
  color: var(--docs-text-primary);
  background-color: var(--docs-bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  margin: 0 0 var(--docs-spacing-md);
  font-weight: 600;
  line-height: 1.3;
  color: var(--docs-text-primary);
}

h1 { font-size: var(--docs-text-4xl); }
h2 { font-size: var(--docs-text-3xl); }
h3 { font-size: var(--docs-text-2xl); }
h4 { font-size: var(--docs-text-xl); }
h5 { font-size: var(--docs-text-lg); }
h6 { font-size: var(--docs-text-base); }

p {
  margin: 0 0 var(--docs-spacing-md);
}

a {
  color: var(--docs-accent-primary);
  text-decoration: none;
  transition: color var(--docs-transition-fast);
}

a:hover {
  color: var(--docs-accent-hover);
  text-decoration: underline;
}

code, pre {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
}

code {
  padding: 0.125rem 0.375rem;
  background-color: var(--docs-bg-tertiary);
  border-radius: var(--docs-radius-sm);
  color: var(--docs-text-primary);
}

pre {
  margin: 0 0 var(--docs-spacing-md);
  padding: var(--docs-spacing-md);
  background-color: var(--docs-bg-code);
  border-radius: var(--docs-radius-lg);
  overflow-x: auto;
}

pre code {
  padding: 0;
  background: none;
  color: var(--docs-text-inverse);
}

/* --------------------------------------------------------------------------
   Layout
   -------------------------------------------------------------------------- */

.docs-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--docs-spacing-lg);
}

.docs-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--docs-spacing-2xl);
  min-height: 100vh;
}

@media (max-width: 1024px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }
}

/* --------------------------------------------------------------------------
   Header
   -------------------------------------------------------------------------- */

.docs-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--docs-bg-primary);
  border-bottom: 1px solid var(--docs-border-light);
  padding: var(--docs-spacing-md) 0;
}

.docs-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--docs-spacing-lg);
}

.docs-header__logo {
  display: flex;
  align-items: center;
  gap: var(--docs-spacing-sm);
  font-size: var(--docs-text-xl);
  font-weight: 700;
  color: var(--docs-text-primary);
}

.docs-header__logo:hover {
  color: var(--docs-text-primary);
  text-decoration: none;
}

.docs-header__nav {
  display: flex;
  gap: var(--docs-spacing-md);
}

/* --------------------------------------------------------------------------
   Sidebar Navigation
   -------------------------------------------------------------------------- */

.docs-sidebar {
  position: sticky;
  top: 80px;
  height: calc(100vh - 100px);
  overflow-y: auto;
  padding: var(--docs-spacing-lg) 0;
}

.docs-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.docs-nav__section {
  margin-bottom: var(--docs-spacing-lg);
}

.docs-nav__title {
  font-size: var(--docs-text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--docs-text-tertiary);
  margin-bottom: var(--docs-spacing-sm);
  padding: 0 var(--docs-spacing-sm);
}

.docs-nav__items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.docs-nav__link {
  display: block;
  padding: var(--docs-spacing-xs) var(--docs-spacing-sm);
  border-radius: var(--docs-radius-md);
  color: var(--docs-text-secondary);
  font-size: var(--docs-text-sm);
  transition: all var(--docs-transition-fast);
}

.docs-nav__link:hover {
  background-color: var(--docs-bg-tertiary);
  color: var(--docs-text-primary);
  text-decoration: none;
}

.docs-nav__link--active {
  background-color: var(--docs-accent-light);
  color: var(--docs-accent-primary);
  font-weight: 500;
}

/* --------------------------------------------------------------------------
   Main Content
   -------------------------------------------------------------------------- */

.docs-main {
  padding: var(--docs-spacing-2xl) 0;
  max-width: 900px;
}

.docs-section {
  margin-bottom: var(--docs-spacing-2xl);
}

.docs-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--docs-spacing-lg);
  padding-bottom: var(--docs-spacing-md);
  border-bottom: 1px solid var(--docs-border-light);
}

.docs-section__title {
  margin: 0;
}

.docs-section__description {
  color: var(--docs-text-secondary);
  margin-bottom: var(--docs-spacing-lg);
}

/* --------------------------------------------------------------------------
   Token Cards
   -------------------------------------------------------------------------- */

.docs-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--docs-spacing-md);
}

.docs-token-card {
  background-color: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border-light);
  border-radius: var(--docs-radius-lg);
  padding: var(--docs-spacing-md);
  transition: all var(--docs-transition-base);
}

.docs-token-card:hover {
  border-color: var(--docs-border-medium);
  box-shadow: var(--docs-shadow-md);
}

.docs-token-card__preview {
  height: 80px;
  border-radius: var(--docs-radius-md);
  margin-bottom: var(--docs-spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-token-card__preview--color {
  border: 1px solid var(--docs-border-light);
}

.docs-token-card__name {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
  font-weight: 500;
  color: var(--docs-text-primary);
  margin-bottom: var(--docs-spacing-xs);
  word-break: break-all;
}

.docs-token-card__value {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-xs);
  color: var(--docs-text-tertiary);
  word-break: break-all;
}

.docs-token-card__description {
  font-size: var(--docs-text-sm);
  color: var(--docs-text-secondary);
  margin-top: var(--docs-spacing-sm);
}

/* --------------------------------------------------------------------------
   Color Swatches
   -------------------------------------------------------------------------- */

.docs-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--docs-spacing-md);
}

.docs-color-swatch {
  border-radius: var(--docs-radius-lg);
  overflow: hidden;
  border: 1px solid var(--docs-border-light);
  background-color: var(--docs-bg-secondary);
}

.docs-color-swatch__preview {
  height: 100px;
  display: flex;
  align-items: flex-end;
  padding: var(--docs-spacing-sm);
}

.docs-color-swatch__contrast {
  font-size: var(--docs-text-xs);
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: var(--docs-radius-sm);
  background-color: rgba(255, 255, 255, 0.9);
  color: #000;
}

.docs-color-swatch__info {
  padding: var(--docs-spacing-md);
}

.docs-color-swatch__name {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
  font-weight: 500;
  color: var(--docs-text-primary);
  margin-bottom: var(--docs-spacing-xs);
}

.docs-color-swatch__values {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.docs-color-swatch__value {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-xs);
  color: var(--docs-text-tertiary);
}

/* --------------------------------------------------------------------------
   Typography Samples
   -------------------------------------------------------------------------- */

.docs-typography-list {
  display: flex;
  flex-direction: column;
  gap: var(--docs-spacing-lg);
}

.docs-typography-sample {
  padding: var(--docs-spacing-lg);
  background-color: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border-light);
  border-radius: var(--docs-radius-lg);
}

.docs-typography-sample__preview {
  margin-bottom: var(--docs-spacing-md);
  padding-bottom: var(--docs-spacing-md);
  border-bottom: 1px solid var(--docs-border-light);
}

.docs-typography-sample__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--docs-spacing-md);
}

.docs-typography-sample__property {
  font-size: var(--docs-text-xs);
  color: var(--docs-text-tertiary);
}

.docs-typography-sample__property strong {
  color: var(--docs-text-secondary);
}

/* --------------------------------------------------------------------------
   Spacing & Size Samples
   -------------------------------------------------------------------------- */

.docs-spacing-list {
  display: flex;
  flex-direction: column;
  gap: var(--docs-spacing-sm);
}

.docs-spacing-sample {
  display: flex;
  align-items: center;
  gap: var(--docs-spacing-md);
  padding: var(--docs-spacing-sm);
  background-color: var(--docs-bg-secondary);
  border-radius: var(--docs-radius-md);
}

.docs-spacing-sample__bar {
  height: 24px;
  background-color: var(--docs-accent-primary);
  border-radius: var(--docs-radius-sm);
  min-width: 4px;
}

.docs-spacing-sample__info {
  display: flex;
  gap: var(--docs-spacing-md);
  flex: 1;
}

.docs-spacing-sample__name {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
  font-weight: 500;
  color: var(--docs-text-primary);
  min-width: 150px;
}

.docs-spacing-sample__value {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
  color: var(--docs-text-tertiary);
}

/* --------------------------------------------------------------------------
   Shadow Samples
   -------------------------------------------------------------------------- */

.docs-shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--docs-spacing-lg);
}

.docs-shadow-sample {
  background-color: var(--docs-bg-primary);
  border-radius: var(--docs-radius-lg);
  padding: var(--docs-spacing-xl);
  text-align: center;
}

.docs-shadow-sample__name {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-sm);
  color: var(--docs-text-primary);
  margin-bottom: var(--docs-spacing-xs);
}

.docs-shadow-sample__value {
  font-family: var(--docs-font-mono);
  font-size: var(--docs-text-xs);
  color: var(--docs-text-tertiary);
  word-break: break-all;
}

/* --------------------------------------------------------------------------
   Code Blocks
   -------------------------------------------------------------------------- */

.docs-code-block {
  position: relative;
  margin-bottom: var(--docs-spacing-lg);
}

.docs-code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--docs-spacing-sm) var(--docs-spacing-md);
  background-color: #334155;
  border-radius: var(--docs-radius-lg) var(--docs-radius-lg) 0 0;
}

.docs-code-block__language {
  font-size: var(--docs-text-xs);
  font-weight: 500;
  color: var(--docs-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.docs-code-block__copy {
  display: flex;
  align-items: center;
  gap: var(--docs-spacing-xs);
  padding: var(--docs-spacing-xs) var(--docs-spacing-sm);
  background-color: transparent;
  border: 1px solid var(--docs-border-medium);
  border-radius: var(--docs-radius-md);
  color: var(--docs-text-tertiary);
  font-size: var(--docs-text-xs);
  cursor: pointer;
  transition: all var(--docs-transition-fast);
}

.docs-code-block__copy:hover {
  background-color: var(--docs-bg-tertiary);
  color: var(--docs-text-secondary);
}

.docs-code-block pre {
  margin: 0;
  border-radius: 0 0 var(--docs-radius-lg) var(--docs-radius-lg);
}

/* --------------------------------------------------------------------------
   Tables
   -------------------------------------------------------------------------- */

.docs-table-wrapper {
  overflow-x: auto;
  margin-bottom: var(--docs-spacing-lg);
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--docs-text-sm);
}

.docs-table th,
.docs-table td {
  padding: var(--docs-spacing-sm) var(--docs-spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--docs-border-light);
}

.docs-table th {
  font-weight: 600;
  color: var(--docs-text-primary);
  background-color: var(--docs-bg-secondary);
}

.docs-table td {
  color: var(--docs-text-secondary);
}

.docs-table tr:hover td {
  background-color: var(--docs-bg-secondary);
}

.docs-table code {
  font-size: var(--docs-text-xs);
}

/* --------------------------------------------------------------------------
   Tabs
   -------------------------------------------------------------------------- */

.docs-tabs {
  margin-bottom: var(--docs-spacing-lg);
}

.docs-tabs__list {
  display: flex;
  gap: var(--docs-spacing-xs);
  border-bottom: 1px solid var(--docs-border-light);
  margin-bottom: var(--docs-spacing-md);
}

.docs-tabs__tab {
  padding: var(--docs-spacing-sm) var(--docs-spacing-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--docs-text-secondary);
  font-size: var(--docs-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--docs-transition-fast);
  margin-bottom: -1px;
}

.docs-tabs__tab:hover {
  color: var(--docs-text-primary);
}

.docs-tabs__tab--active {
  color: var(--docs-accent-primary);
  border-bottom-color: var(--docs-accent-primary);
}

.docs-tabs__panel {
  display: none;
}

.docs-tabs__panel--active {
  display: block;
}

/* --------------------------------------------------------------------------
   Badges & Tags
   -------------------------------------------------------------------------- */

.docs-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: var(--docs-text-xs);
  font-weight: 500;
  border-radius: var(--docs-radius-full);
  background-color: var(--docs-bg-tertiary);
  color: var(--docs-text-secondary);
}

.docs-badge--primary {
  background-color: var(--docs-accent-light);
  color: var(--docs-accent-primary);
}

.docs-badge--success {
  background-color: #dcfce7;
  color: #15803d;
}

.docs-badge--warning {
  background-color: #fef3c7;
  color: #b45309;
}

.docs-badge--error {
  background-color: #fee2e2;
  color: #dc2626;
}

/* --------------------------------------------------------------------------
   Search
   -------------------------------------------------------------------------- */

.docs-search {
  position: relative;
}

.docs-search__input {
  width: 100%;
  padding: var(--docs-spacing-sm) var(--docs-spacing-md);
  padding-left: 2.5rem;
  background-color: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border-light);
  border-radius: var(--docs-radius-lg);
  font-size: var(--docs-text-sm);
  color: var(--docs-text-primary);
  transition: all var(--docs-transition-fast);
}

.docs-search__input:focus {
  outline: none;
  border-color: var(--docs-accent-primary);
  box-shadow: 0 0 0 3px var(--docs-accent-light);
}

.docs-search__input::placeholder {
  color: var(--docs-text-tertiary);
}

.docs-search__icon {
  position: absolute;
  left: var(--docs-spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--docs-text-tertiary);
  pointer-events: none;
}

/* --------------------------------------------------------------------------
   Buttons
   -------------------------------------------------------------------------- */

.docs-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--docs-spacing-xs);
  padding: var(--docs-spacing-sm) var(--docs-spacing-md);
  font-size: var(--docs-text-sm);
  font-weight: 500;
  border-radius: var(--docs-radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--docs-transition-fast);
}

.docs-button--primary {
  background-color: var(--docs-accent-primary);
  color: white;
}

.docs-button--primary:hover {
  background-color: var(--docs-accent-hover);
}

.docs-button--secondary {
  background-color: var(--docs-bg-secondary);
  border-color: var(--docs-border-light);
  color: var(--docs-text-primary);
}

.docs-button--secondary:hover {
  background-color: var(--docs-bg-tertiary);
  border-color: var(--docs-border-medium);
}

.docs-button--ghost {
  background-color: transparent;
  color: var(--docs-text-secondary);
}

.docs-button--ghost:hover {
  background-color: var(--docs-bg-tertiary);
  color: var(--docs-text-primary);
}

/* --------------------------------------------------------------------------
   Alerts
   -------------------------------------------------------------------------- */

.docs-alert {
  display: flex;
  gap: var(--docs-spacing-md);
  padding: var(--docs-spacing-md);
  border-radius: var(--docs-radius-lg);
  margin-bottom: var(--docs-spacing-lg);
}

.docs-alert--info {
  background-color: var(--docs-accent-light);
  border: 1px solid var(--docs-accent-primary);
}

.docs-alert--success {
  background-color: #dcfce7;
  border: 1px solid var(--docs-success);
}

.docs-alert--warning {
  background-color: #fef3c7;
  border: 1px solid var(--docs-warning);
}

.docs-alert--error {
  background-color: #fee2e2;
  border: 1px solid var(--docs-error);
}

.docs-alert__icon {
  flex-shrink: 0;
}

.docs-alert__content {
  flex: 1;
}

.docs-alert__title {
  font-weight: 600;
  margin-bottom: var(--docs-spacing-xs);
}

.docs-alert__message {
  font-size: var(--docs-text-sm);
  color: var(--docs-text-secondary);
}

/* --------------------------------------------------------------------------
   Footer
   -------------------------------------------------------------------------- */

.docs-footer {
  padding: var(--docs-spacing-xl) 0;
  border-top: 1px solid var(--docs-border-light);
  margin-top: var(--docs-spacing-2xl);
}

.docs-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--docs-spacing-md);
}

.docs-footer__text {
  font-size: var(--docs-text-sm);
  color: var(--docs-text-tertiary);
}

.docs-footer__links {
  display: flex;
  gap: var(--docs-spacing-md);
}

.docs-footer__link {
  font-size: var(--docs-text-sm);
  color: var(--docs-text-tertiary);
}

.docs-footer__link:hover {
  color: var(--docs-text-secondary);
}

/* --------------------------------------------------------------------------
   Utility Classes
   -------------------------------------------------------------------------- */

.docs-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.docs-flex {
  display: flex;
}

.docs-items-center {
  align-items: center;
}

.docs-justify-between {
  justify-content: space-between;
}

.docs-gap-sm {
  gap: var(--docs-spacing-sm);
}

.docs-gap-md {
  gap: var(--docs-spacing-md);
}

.docs-gap-lg {
  gap: var(--docs-spacing-lg);
}

.docs-mt-md {
  margin-top: var(--docs-spacing-md);
}

.docs-mt-lg {
  margin-top: var(--docs-spacing-lg);
}

.docs-mb-md {
  margin-bottom: var(--docs-spacing-md);
}

.docs-mb-lg {
  margin-bottom: var(--docs-spacing-lg);
}

.docs-text-center {
  text-align: center;
}

.docs-text-right {
  text-align: right;
}

/* --------------------------------------------------------------------------
   Responsive
   -------------------------------------------------------------------------- */

@media (max-width: 768px) {
  :root {
    --docs-spacing-lg: 1rem;
    --docs-spacing-xl: 1.5rem;
    --docs-spacing-2xl: 2rem;
  }
  
  h1 { font-size: var(--docs-text-3xl); }
  h2 { font-size: var(--docs-text-2xl); }
  h3 { font-size: var(--docs-text-xl); }
  
  .docs-sidebar {
    display: none;
  }
  
  .docs-token-grid,
  .docs-color-grid,
  .docs-shadow-grid {
    grid-template-columns: 1fr;
  }
  
  .docs-footer__inner {
    flex-direction: column;
    text-align: center;
  }
}

/* --------------------------------------------------------------------------
   Print Styles
   -------------------------------------------------------------------------- */

@media print {
  .docs-header,
  .docs-sidebar,
  .docs-footer,
  .docs-code-block__copy {
    display: none;
  }
  
  .docs-layout {
    display: block;
  }
  
  .docs-main {
    max-width: 100%;
  }
  
  .docs-token-card,
  .docs-color-swatch,
  .docs-typography-sample,
  .docs-shadow-sample {
    break-inside: avoid;
  }
}
`;
}
