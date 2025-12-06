/**
 * Figma API Types
 *
 * Types for Figma API responses and plugin data structures.
 * Used by: fetchFigmaRegistry, compareFigmaTokens
 */

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  sharedPluginData?: {
    [namespace: string]: {
      [key: string]: string;
    };
  };
  children?: FigmaNode[];
}

export interface FigmaNodesResponse {
  nodes: {
    [nodeId: string]: {
      document: FigmaNode;
    };
  };
}

export interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, any>;
  componentSets: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}
