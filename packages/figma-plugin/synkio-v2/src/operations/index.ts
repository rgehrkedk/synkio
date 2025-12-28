// =============================================================================
// Operations Module - Barrel Export
// =============================================================================

export { buildBaseline } from './baseline';
export { parseColor } from './color-parser';
export { weightToStyle } from './typography';
export { createOrUpdateVariable, getResolvedType, convertValueForFigma } from './variable-ops';
export type { VariableChangeInput } from './variable-ops';
export { createOrUpdateStyle } from './style-ops';
export type { StyleChangeInput } from './style-ops';
