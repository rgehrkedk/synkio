/**
 * Collection and file type definitions
 */

/**
 * Uploaded token file
 */
export interface TokenFile {
  name: string;
  content: any;
  size?: number;
}

/**
 * Collection configuration for import
 */
export interface CollectionConfig {
  name: string;
  files: TokenFile[];
  isModeCollection: boolean; // If true, each file becomes a mode
}

/**
 * Collection summary for display
 */
export interface CollectionSummary {
  id: string;
  name: string;
  modeCount: number;
  variableCount: number;
}

/**
 * File data for UI state
 */
export interface FileData {
  name: string;
  content: any;
  size: number;
}
