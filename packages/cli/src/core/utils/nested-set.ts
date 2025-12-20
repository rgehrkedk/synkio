/**
 * Nested Set Utility
 *
 * Sets a value at a nested path in an object, creating intermediate objects as needed.
 */

/**
 * Sets a value at a nested path in an object, creating intermediate objects as needed.
 * Mutates the target object in place.
 *
 * @param obj - The object to set the value in (will be mutated)
 * @param path - Array of path segments to navigate to the target location
 * @param value - The value to set at the path
 *
 * @example
 * const obj = {};
 * setNestedPath(obj, ['a', 'b', 'c'], 42);
 * // obj is now { a: { b: { c: 42 } } }
 */
export function setNestedPath(obj: any, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    current = current[key] = current[key] || {};
  }
  current[path.at(-1)!] = value;
}
