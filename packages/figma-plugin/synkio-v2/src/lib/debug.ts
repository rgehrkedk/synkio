// =============================================================================
// Debug Logger
// Conditional logging that can be enabled/disabled
// =============================================================================

let debugEnabled = false;

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debug(message: string, ...args: unknown[]): void {
  if (debugEnabled) {
    console.log(`[synkio] ${message}`, ...args);
  }
}

export function debugGroup(label: string): void {
  if (debugEnabled) {
    // console.group not available in Figma sandbox, use indented log
    console.log(`[synkio] ▼ ${label}`);
  }
}

export function debugGroupEnd(): void {
  if (debugEnabled) {
    // console.groupEnd not available in Figma sandbox, use separator
    console.log(`[synkio] ▲ end`);
  }
}

export function debugTable(data: unknown): void {
  if (debugEnabled) {
    // console.table not available in Figma sandbox, use JSON
    console.log(`[synkio] table:`, JSON.stringify(data, null, 2));
  }
}
