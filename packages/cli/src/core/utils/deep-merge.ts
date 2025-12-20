/**
 * Deep Merge Utility
 *
 * Recursively merges source object into target object.
 * Mutates the target object in place.
 */

/**
 * Deep merge source object into target object (mutates target)
 *
 * @param target - The target object to merge into (will be mutated)
 * @param source - The source object to merge from
 *
 * @example
 * const target = { a: { b: 1 } };
 * deepMerge(target, { a: { c: 2 } });
 * // target is now { a: { b: 1, c: 2 } }
 */
export function deepMerge(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
