// =============================================================================
// Typography Operations
// =============================================================================

/**
 * Converts a numeric font weight to Figma's font style string.
 *
 * @param weight - Numeric font weight (100-900)
 * @returns Font style string (e.g., "Regular", "Bold", "Light")
 */
export function weightToStyle(weight: number): string {
  const weightMap: Record<number, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black',
  };
  return weightMap[weight] || 'Regular';
}
