/**
 * Type inference patterns for token path analysis
 */

import type { TokenType } from '../../types/index.js';

/**
 * Pattern definition for type inference
 */
export interface TypePattern {
  /** Keywords to match (case-insensitive) */
  keywords: string[];
  /** Base token type this pattern infers */
  type: TokenType;
  /** Priority (higher = checked first) */
  priority: number;
  /** Optional refinement function */
  refine?: (path: string) => TokenType;
}

/**
 * Type inference patterns ordered by priority
 */
export const TYPE_PATTERNS: TypePattern[] = [
  // Font-related patterns (need refinement based on context)
  {
    keywords: ['font', 'typography'],
    type: 'string',
    priority: 100,
    refine: (path: string) => {
      const lower = path.toLowerCase();
      if (lower.includes('size')) return 'dimension';
      if (lower.includes('weight')) return 'fontWeight';
      if (lower.includes('family')) return 'fontFamily';
      if (lower.includes('lineheight') || lower.includes('line-height')) return 'number';
      return 'string';
    }
  },

  // Color patterns
  {
    keywords: ['color', 'colors', 'colours'],
    type: 'color',
    priority: 90
  },

  // Dimension patterns
  {
    keywords: ['spacing', 'space', 'size', 'radius', 'borderradius', 'border-radius'],
    type: 'dimension',
    priority: 85
  },

  // Shadow patterns
  {
    keywords: ['shadow', 'boxshadow'],
    type: 'shadow',
    priority: 80
  },

  // Number patterns
  {
    keywords: ['opacity', 'zindex', 'z-index'],
    type: 'number',
    priority: 75
  },

  // Semantic patterns
  {
    keywords: ['brand', 'semantic', 'component', 'background', 'foreground', 'border', 'fill', 'stroke'],
    type: 'color',
    priority: 70
  },

  // Layout patterns
  {
    keywords: ['gap', 'padding', 'margin'],
    type: 'dimension',
    priority: 65
  },

  // Animation patterns
  {
    keywords: ['transition', 'animation', 'breakpoint'],
    type: 'string',
    priority: 60
  }
];
