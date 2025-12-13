/**
 * DOM Utilities
 * Helper functions for common DOM manipulation tasks
 */

/**
 * Get an element by ID with type safety
 * @param id - Element ID
 * @returns Element or null if not found
 */
export function getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Query selector with type safety
 * @param selector - CSS selector
 * @param parent - Parent element to search within (defaults to document)
 * @returns First matching element or null
 */
export function querySelector<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Query all matching elements
 * @param selector - CSS selector
 * @param parent - Parent element to search within (defaults to document)
 * @returns Array of matching elements
 */
export function querySelectorAll<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Create an element with optional attributes and children
 * @param tagName - HTML tag name
 * @param attributes - Optional attributes to set
 * @param children - Optional child nodes or text
 * @returns Created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (children) {
    children.forEach((child) => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * Remove all children from an element
 * @param element - Element to clear
 */
export function removeAllChildren(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Toggle a class on an element
 * @param element - Element to toggle class on
 * @param className - Class name to toggle
 * @param force - Optional boolean to force add or remove
 */
export function toggleClass(element: Element, className: string, force?: boolean): void {
  element.classList.toggle(className, force);
}

/**
 * Add event listener with automatic cleanup
 * @param element - Element to attach listener to
 * @param event - Event name
 * @param handler - Event handler
 * @returns Cleanup function
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void
): () => void {
  element.addEventListener(event, handler as EventListener);
  return () => element.removeEventListener(event, handler as EventListener);
}

/**
 * Show an element (remove display: none)
 * @param element - Element to show
 */
export function show(element: HTMLElement): void {
  element.style.display = '';
}

/**
 * Hide an element (set display: none)
 * @param element - Element to hide
 */
export function hide(element: HTMLElement): void {
  element.style.display = 'none';
}
