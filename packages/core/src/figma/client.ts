import pRetry, { AbortError } from 'p-retry';
import type { Logger } from '../logger.js';

export interface FigmaClientOptions {
  fileId: string;
  nodeId?: string;
  accessToken: string;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger;
}

/**
 * FigmaClient encapsulates all Figma API calls with retry logic and timeout protection
 * Features:
 * - Exponential backoff retry (1s, 2s, 4s)
 * - 30-second default timeout
 * - Rate limit handling (429 responses)
 * - Request ID extraction for debugging
 */
export class FigmaClient {
  private fileId: string;
  private nodeId?: string;
  private accessToken: string;
  private timeout: number;
  private maxRetries: number;
  private logger?: Logger;

  constructor(options: FigmaClientOptions) {
    this.fileId = options.fileId;
    this.nodeId = options.nodeId;
    this.accessToken = options.accessToken;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.logger = options.logger;
  }

  /**
   * Main entry point - fetches data using optimal strategy
   */
  async fetchData(): Promise<any> {
    if (this.nodeId) {
      return this.fetchFromNode(this.nodeId);
    } else {
      return this.fetchFromFile();
    }
  }

  /**
   * Fast path: Fetch from specific node using plugin data
   */
  private async fetchFromNode(nodeId: string): Promise<any> {
    const normalizedNodeId = nodeId.replace('-', ':');
    const url = `https://api.figma.com/v1/files/${this.fileId}/nodes?ids=${encodeURIComponent(normalizedNodeId)}&plugin_data=shared`;

    this.logger?.debug?.('Fetching from node', { nodeId: normalizedNodeId });

    const data = await this.fetch<any>(url);
    const nodeData = data.nodes?.[normalizedNodeId];

    if (!nodeData) {
      throw new Error(`Node not found: ${normalizedNodeId}`);
    }

    const pluginNamespace = 'io.synkio.token-vault';
    const pluginData = nodeData.document?.sharedPluginData?.[pluginNamespace];

    if (!pluginData) {
      throw new Error(`No plugin data found. Run "Sync" in Token Vault plugin first.`);
    }

    return this.extractChunkedData(pluginData);
  }

  /**
   * Slow path: Fetch entire file and search for plugin data
   */
  private async fetchFromFile(): Promise<any> {
    const pluginId = '1234567890'; // Token Vault plugin ID
    const url = `https://api.figma.com/v1/files/${this.fileId}?plugin_data=${pluginId}`;

    this.logger?.debug?.('Fetching entire file', { fileId: this.fileId });

    const data = await this.fetch<any>(url);
    return this.findPluginData(data.document);
  }

  /**
   * Core fetch method with retry logic and timeout
   */
  private async fetch<T>(url: string): Promise<T> {
    return pRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            headers: { 'X-Figma-Token': this.accessToken },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Extract request ID for debugging
          const requestId = response.headers.get('X-Request-Id');

          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            this.logger?.warn?.('Rate limited, will retry', { requestId, retryAfter });
            throw new Error('Rate limited');
          }

          // Retry on server errors
          if (response.status >= 500) {
            this.logger?.warn?.(`Server error ${response.status}, will retry`, { requestId });
            throw new Error(`Server error: ${response.status}`);
          }

          // Abort on client errors (except 429)
          if (!response.ok) {
            const errorText = await response.text();
            throw new AbortError(`Figma API error (${response.status}): ${errorText}`);
          }

          return response.json() as Promise<T>;
        } catch (error: any) {
          clearTimeout(timeoutId);

          if (error.name === 'AbortError') {
            throw new AbortError(`Request timeout after ${this.timeout}ms`);
          }

          throw error;
        }
      },
      {
        retries: this.maxRetries,
        factor: 2,           // Exponential backoff: 1s, 2s, 4s
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true,     // Add jitter to prevent thundering herd
        onFailedAttempt: (error) => {
          this.logger?.info?.(
            `Retry attempt ${error.attemptNumber}/${this.maxRetries + 1}`,
            { retriesLeft: error.retriesLeft }
          );
        },
      }
    );
  }

  /**
   * Extract chunked plugin data (data may be split across multiple keys)
   */
  private extractChunkedData(pluginData: Record<string, string>): any {
    if (pluginData.data) {
      return JSON.parse(pluginData.data);
    }

    // Handle chunked data
    const chunkKeys = Object.keys(pluginData)
      .filter(key => key.startsWith('chunk_'))
      .sort();

    if (chunkKeys.length === 0) {
      throw new Error('No data or chunks found in plugin data');
    }

    const fullData = chunkKeys.map(key => pluginData[key]).join('');
    return JSON.parse(fullData);
  }

  /**
   * Recursively search document tree for plugin data
   */
  private findPluginData(node: any): any {
    const pluginNamespace = 'io.synkio.token-vault';

    if (node.sharedPluginData?.[pluginNamespace]) {
      return this.extractChunkedData(node.sharedPluginData[pluginNamespace]);
    }

    if (node.children) {
      for (const child of node.children) {
        const result = this.findPluginData(child);
        if (result) return result;
      }
    }

    throw new Error('No plugin data found in file. Run "Sync" in Token Vault plugin first.');
  }
}
