/**
 * Utility functions for Figma data processing
 */

/**
 * Detects phantom Figma modes (internal IDs like "21598:4")
 * These occur when modes are deleted or names aren't properly resolved
 *
 * @param mode - The mode name to check
 * @returns true if the mode is a phantom mode (internal Figma ID)
 */
export const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);

/**
 * Filters out tokens with phantom modes from a token record
 *
 * @param tokens - Record of tokens with optional mode property
 * @returns Filtered record with phantom mode tokens removed
 */
export const filterPhantomModes = <T extends { mode?: string }>(
  tokens: Record<string, T>
): Record<string, T> => {
  return Object.fromEntries(
    Object.entries(tokens).filter(([_, entry]) => !isPhantomMode(entry.mode || ''))
  );
};
