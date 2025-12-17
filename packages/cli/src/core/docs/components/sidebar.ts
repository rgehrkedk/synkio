/**
 * Sidebar component for documentation pages
 */
import type { NavItem } from './types.js';

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  activePage: string;
}

/**
 * Generate the sidebar HTML
 */
export function renderSidebar({ title, navItems, activePage }: SidebarProps): string {
  return `
    <!-- Sidebar -->
    <aside class="docs-sidebar">
      <a href="index.html" class="docs-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#6366f1"/>
          <path d="M8 16L14 22L24 10" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${title}
      </a>

      <nav class="docs-nav">
        <a href="index.html" class="${activePage === 'index' ? 'active' : ''}">
          Overview
        </a>

        <div class="docs-nav-section">Collections</div>
        ${navItems.map(item => `
        <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
          ${item.label}
          <span class="docs-nav-count">${item.count}</span>
        </a>
        `).join('')}

        <a href="all-tokens.html" class="${activePage === 'all' ? 'active' : ''}">
          All Tokens
        </a>

        <div class="docs-nav-section">Resources</div>
        <a href="tokens.json" target="_blank">
          tokens.json ↗
        </a>
      </nav>
    </aside>`;
}
