/**
 * Shared types for docs components
 */

import type { IntermediateTokenFormat } from '../../intermediate-tokens.js';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  count: number;
}

export interface TemplateOptions {
  title: string;
  modes: string[];
  defaultMode: string;
  syncedAt: string;
  navItems: NavItem[];
  /** Metadata from intermediate token format (includes SD platform info with naming conventions) */
  metadata?: IntermediateTokenFormat['$metadata'];
}
