/**
 * Documentation components - modular building blocks for docs pages
 */

// Types
export type { NavItem, TemplateOptions } from './types.js';

// Utilities
export {
  escapeHtml,
  capitalizeFirst,
  getPageTitle,
  getDefaultPlatform,
  getPlatformLabel,
  formatDisplayValue,
  formatReferencePath,
  getColorBackground,
  formatTypeName
} from './utils.js';

// Components
export { renderSidebar } from './sidebar.js';
export { renderHeaderControls } from './header-controls.js';
export { layout } from './layout.js';
export { renderModeToggle, renderCollectionModeToggles } from './mode-toggle.js';

// Token cards
export {
  renderColorTokenCard,
  renderTypographyTokenCard,
  renderGenericTokenCard,
  renderTokenCard,
  renderPlatformVariables,
  renderPlatformVariablesCode,
  isColorToken,
  isTypographyToken,
  isSpacingToken
} from './token-cards.js';
