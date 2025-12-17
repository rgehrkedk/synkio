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
  return `/**
 * Synkio Documentation Styles
 * This file styles the documentation site itself
 */

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Documentation theme colors */
  --docs-bg: #0f0f0f;
  --docs-bg-secondary: #1a1a1a;
  --docs-bg-tertiary: #252525;
  --docs-text: #ffffff;
  --docs-text-muted: #a0a0a0;
  --docs-border: #333333;
  --docs-accent: #6366f1;
  --docs-accent-hover: #818cf8;
  --docs-success: #22c55e;
  --docs-warning: #eab308;
  --docs-error: #ef4444;
  
  /* Typography */
  --docs-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --docs-font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  
  /* Spacing */
  --docs-space-xs: 0.25rem;
  --docs-space-sm: 0.5rem;
  --docs-space-md: 1rem;
  --docs-space-lg: 1.5rem;
  --docs-space-xl: 2rem;
  --docs-space-2xl: 3rem;
  
  /* Border radius */
  --docs-radius-sm: 0.25rem;
  --docs-radius-md: 0.5rem;
  --docs-radius-lg: 0.75rem;
}

/* Light mode */
[data-theme="light"] {
  --docs-bg: #ffffff;
  --docs-bg-secondary: #f5f5f5;
  --docs-bg-tertiary: #e5e5e5;
  --docs-text: #171717;
  --docs-text-muted: #737373;
  --docs-border: #e5e5e5;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--docs-font-sans);
  background: var(--docs-bg);
  color: var(--docs-text);
  line-height: 1.6;
  min-height: 100vh;
}

/* Layout */
.docs-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }
  
  .docs-sidebar {
    display: none;
  }
  
  .docs-sidebar.open {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 100;
  }
}

/* Sidebar */
.docs-sidebar {
  background: var(--docs-bg-secondary);
  border-right: 1px solid var(--docs-border);
  padding: var(--docs-space-lg);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.docs-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--docs-text);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: var(--docs-space-sm);
  margin-bottom: var(--docs-space-xl);
}

.docs-logo svg {
  width: 28px;
  height: 28px;
}

.docs-nav {
  display: flex;
  flex-direction: column;
  gap: var(--docs-space-xs);
}

.docs-nav a {
  color: var(--docs-text-muted);
  text-decoration: none;
  padding: var(--docs-space-sm) var(--docs-space-md);
  border-radius: var(--docs-radius-md);
  transition: all 0.15s ease;
  font-size: 0.9375rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.docs-nav a:hover {
  color: var(--docs-text);
  background: var(--docs-bg-tertiary);
}

.docs-nav a.active {
  color: var(--docs-accent);
  background: rgba(99, 102, 241, 0.1);
}

.docs-nav-count {
  font-size: 0.75rem;
  color: var(--docs-text-muted);
  background: var(--docs-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--docs-radius-sm);
  font-weight: 500;
}

.docs-nav a.active .docs-nav-count {
  background: rgba(99, 102, 241, 0.2);
  color: var(--docs-accent);
}

.docs-nav-section {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--docs-text-muted);
  padding: var(--docs-space-md) var(--docs-space-md) var(--docs-space-sm);
  margin-top: var(--docs-space-md);
}

/* Main content */
.docs-main {
  padding: var(--docs-space-2xl);
  max-width: 1200px;
}

/* Header */
.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--docs-space-2xl);
  padding-bottom: var(--docs-space-lg);
  border-bottom: 1px solid var(--docs-border);
}

.docs-title {
  font-size: 2rem;
  font-weight: 700;
}

.docs-subtitle {
  color: var(--docs-text-muted);
  margin-top: var(--docs-space-xs);
}

/* Controls */
.docs-controls {
  display: flex;
  gap: var(--docs-space-md);
  align-items: center;
}

.docs-search {
  background: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border);
  border-radius: var(--docs-radius-md);
  padding: var(--docs-space-sm) var(--docs-space-md);
  color: var(--docs-text);
  font-size: 0.875rem;
  width: 240px;
  outline: none;
  transition: border-color 0.15s ease;
}

.docs-search:focus {
  border-color: var(--docs-accent);
}

.docs-search::placeholder {
  color: var(--docs-text-muted);
}

.docs-mode-switcher {
  display: flex;
  background: var(--docs-bg-secondary);
  border-radius: var(--docs-radius-md);
  padding: var(--docs-space-xs);
  gap: var(--docs-space-xs);
}

.docs-mode-btn {
  background: transparent;
  border: none;
  color: var(--docs-text-muted);
  padding: var(--docs-space-xs) var(--docs-space-md);
  border-radius: var(--docs-radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s ease;
}

.docs-mode-btn:hover {
  color: var(--docs-text);
}

.docs-mode-btn.active {
  background: var(--docs-accent);
  color: white;
}

.docs-platform-switcher {
  display: flex;
  align-items: center;
  gap: var(--docs-space-xs);
}

.docs-platform-select {
  background: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border);
  border-radius: var(--docs-radius-md);
  padding: var(--docs-space-xs) var(--docs-space-md);
  color: var(--docs-text);
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.docs-platform-select:hover {
  border-color: var(--docs-accent);
}

.docs-platform-select:focus {
  border-color: var(--docs-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.docs-theme-toggle {
  background: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border);
  border-radius: var(--docs-radius-md);
  padding: var(--docs-space-sm);
  cursor: pointer;
  color: var(--docs-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.docs-theme-toggle:hover {
  color: var(--docs-text);
  border-color: var(--docs-accent);
}

/* Stats grid */
.docs-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--docs-space-md);
  margin-bottom: var(--docs-space-2xl);
}

.docs-stat-card {
  background: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border);
  border-radius: var(--docs-radius-lg);
  padding: var(--docs-space-lg);
  transition: all 0.15s ease;
}

.docs-stat-card--clickable {
  cursor: pointer;
}

.docs-stat-card--clickable:hover {
  border-color: var(--docs-accent);
  transform: translateY(-2px);
}

.docs-stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--docs-accent);
}

.docs-stat-label {
  font-size: 0.875rem;
  color: var(--docs-text-muted);
  margin-top: var(--docs-space-xs);
}

/* Token grid */
.docs-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--docs-space-md);
}

.docs-token-card {
  background: var(--docs-bg-secondary);
  border: 1px solid var(--docs-border);
  border-radius: var(--docs-radius-lg);
  overflow: hidden;
  transition: all 0.15s ease;
}

.docs-token-card:hover {
  border-color: var(--docs-accent);
  transform: translateY(-2px);
}

/* Color swatch */
.docs-color-preview {
  height: 100px;
  position: relative;
}

.docs-color-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, #ccc 25%, transparent 25%),
              linear-gradient(-45deg, #ccc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ccc 75%),
              linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  z-index: 0;
  opacity: 0.3;
}

.docs-color-preview-inner {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.docs-token-info {
  padding: var(--docs-space-md);
}

.docs-token-name {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: var(--docs-space-xs);
  word-break: break-all;
}

.docs-token-value {
  font-family: var(--docs-font-mono);
  font-size: 0.75rem;
  color: var(--docs-text-muted);
  background: var(--docs-bg-tertiary);
  padding: var(--docs-space-xs) var(--docs-space-sm);
  border-radius: var(--docs-radius-sm);
  display: inline-flex;
  align-items: center;
  gap: var(--docs-space-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 100%;
  overflow: hidden;
}

.docs-token-value:hover {
  background: var(--docs-accent);
  color: white;
}

.docs-token-variable {
  font-family: var(--docs-font-mono);
  font-size: 0.6875rem;
  color: var(--docs-text-muted);
  margin-top: var(--docs-space-xs);
  word-break: break-all;
}

/* Token reference indicator */
.docs-token-reference {
  font-family: var(--docs-font-mono);
  font-size: 0.6875rem;
  color: var(--docs-accent);
  margin-bottom: var(--docs-space-xs);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--docs-radius-sm);
  transition: all 0.15s ease;
  word-break: break-all;
}

.docs-token-reference:hover {
  background: rgba(99, 102, 241, 0.2);
}

.docs-token-card--reference {
  border: 1px solid var(--docs-border);
}

/* Typography preview */
.docs-typography-preview {
  padding: var(--docs-space-lg);
  min-height: 80px;
  display: flex;
  align-items: center;
}

/* Spacing preview */
.docs-spacing-preview {
  padding: var(--docs-space-md);
  display: flex;
  align-items: center;
  gap: var(--docs-space-md);
}

.docs-spacing-box {
  background: var(--docs-accent);
  opacity: 0.3;
  border-radius: var(--docs-radius-sm);
}

/* Token table */
.docs-token-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.docs-token-table th,
.docs-token-table td {
  text-align: left;
  padding: var(--docs-space-md);
  border-bottom: 1px solid var(--docs-border);
}

.docs-token-table th {
  font-weight: 600;
  color: var(--docs-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.docs-token-table tr:hover td {
  background: var(--docs-bg-secondary);
}

.docs-table-row--reference {
  border-left: 3px solid var(--docs-accent);
}

.docs-table-reference {
  color: var(--docs-accent);
  cursor: pointer;
}

.docs-table-reference:hover {
  text-decoration: underline;
}

.docs-token-table code {
  font-family: var(--docs-font-mono);
  font-size: 0.8125rem;
  background: var(--docs-bg-tertiary);
  padding: var(--docs-space-xs) var(--docs-space-sm);
  border-radius: var(--docs-radius-sm);
}

/* Copy feedback */
.docs-copied {
  position: fixed;
  bottom: var(--docs-space-xl);
  right: var(--docs-space-xl);
  background: var(--docs-success);
  color: white;
  padding: var(--docs-space-sm) var(--docs-space-lg);
  border-radius: var(--docs-radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s ease;
  pointer-events: none;
}

.docs-copied.show {
  opacity: 1;
  transform: translateY(0);
}

/* Footer */
.docs-footer {
  margin-top: var(--docs-space-2xl);
  padding-top: var(--docs-space-lg);
  border-top: 1px solid var(--docs-border);
  font-size: 0.875rem;
  color: var(--docs-text-muted);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.docs-footer a {
  color: var(--docs-accent);
  text-decoration: none;
}

.docs-footer a:hover {
  text-decoration: underline;
}

/* Section headers */
.docs-section {
  margin-bottom: var(--docs-space-2xl);
}

.docs-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--docs-space-lg);
}

.docs-section-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.docs-section-count {
  font-size: 0.875rem;
  color: var(--docs-text-muted);
  background: var(--docs-bg-secondary);
  padding: var(--docs-space-xs) var(--docs-space-md);
  border-radius: var(--docs-radius-md);
}

/* Subsection headers (hierarchical grouping) */
.docs-subsection {
  margin-top: var(--docs-space-xl);
  margin-bottom: var(--docs-space-md);
}

.docs-section > .docs-subsection:first-of-type {
  margin-top: 0;
}

.docs-subsection-header {
  display: flex;
  align-items: center;
  gap: var(--docs-space-sm);
  padding-bottom: var(--docs-space-sm);
  border-bottom: 1px solid var(--docs-border);
  margin-bottom: var(--docs-space-md);
}

.docs-subsection-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--docs-text);
}

.docs-subsection-count {
  font-size: 0.75rem;
  color: var(--docs-text-muted);
  background: var(--docs-bg-tertiary);
  padding: 2px var(--docs-space-sm);
  border-radius: var(--docs-radius-sm);
}

.docs-token-grid--subsection {
  margin-bottom: var(--docs-space-xl);
}

/* Empty state */
.docs-empty {
  text-align: center;
  padding: var(--docs-space-2xl);
  color: var(--docs-text-muted);
}

/* Mobile menu toggle */
.docs-mobile-toggle {
  display: none;
  position: fixed;
  bottom: var(--docs-space-lg);
  left: var(--docs-space-lg);
  background: var(--docs-accent);
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  cursor: pointer;
  z-index: 99;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .docs-mobile-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--docs-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--docs-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--docs-text-muted);
}
`;
}
