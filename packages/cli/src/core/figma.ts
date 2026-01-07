import pRetry, { AbortError } from 'p-retry';
import type { Logger } from '../utils/logger.js';

export interface FigmaClientOptions {
  fileId: string;
  nodeId?: string;
  accessToken: string;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger;
  baseUrl?: string;
}

/**
 * FigmaClient encapsulates all Figma API calls with retry logic and timeout protection
 * Features:
 * - Exponential backoff retry (1s, 2s, 4s)
 * - 60-second default timeout (configurable)
 * - Rate limit handling (429 responses)
 * - Request ID extraction for debugging
 */
export class FigmaClient {
  private readonly fileId: string;
  private readonly nodeId: string;
  private readonly accessToken: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly logger?: Logger;
  private readonly baseUrl: string;

  // Plugin namespaces to check (synkio first, then legacy token_vault)
  private static readonly NAMESPACES = ['synkio', 'token_vault'];

  constructor(options: FigmaClientOptions) {
    this.fileId = options.fileId;
    this.nodeId = options.nodeId || '0:0'; // Default to document root
    this.accessToken = options.accessToken;
    this.timeout = options.timeout ?? 120000;
    this.maxRetries = options.maxRetries ?? 3;
    this.logger = options.logger;
    this.baseUrl = options.baseUrl || 'https://api.figma.com';
  }

  /**
   * Main entry point - fetches data from node (defaults to document root)
   */
  async fetchData(): Promise<any> {
    return this.fetchFromNode(this.nodeId);
  }

  /**
   * Performs a lightweight API call to check if the file is accessible with the given token.
   * Uses the versions endpoint with page_size=1 to minimize data transfer - much faster
   * for large files than fetching full file metadata.
   */
  async validateConnection(): Promise<void> {
    const url = `${this.baseUrl}/v1/files/${this.fileId}/versions?page_size=1`;
    this.logger?.debug?.('Validating connection', { fileId: this.fileId });
    // We only care about the response status, not the body.
    await this.fetch<any>(url);
  }

  /**
   * Fast path: Fetch from specific node using plugin data
   */
  private async fetchFromNode(nodeId: string): Promise<any> {
    const normalizedNodeId = nodeId.replace('-', ':');
    const url = `${this.baseUrl}/v1/files/${this.fileId}/nodes?ids=${encodeURIComponent(normalizedNodeId)}&plugin_data=shared`;

    this.logger?.debug?.('Fetching from node', { nodeId: normalizedNodeId });

    const data = await this.fetch<any>(url);
    const nodeData = data.nodes?.[normalizedNodeId];

    if (!nodeData) {
      throw new Error(`Node not found: ${normalizedNodeId}`);
    }

    // Try each namespace until we find data
    for (const namespace of FigmaClient.NAMESPACES) {
      const pluginData = nodeData.document?.sharedPluginData?.[namespace];
      if (pluginData) {
        this.logger?.debug?.('Found plugin data', { namespace });
        return this.extractChunkedData(pluginData, namespace);
      }
    }

    throw new Error(`No plugin data found. Run the Synkio plugin in Figma first.`);
  }

  /**
   * Slow path: Fetch entire file and search for plugin data
   */
  private async fetchFromFile(): Promise<any> {
    const pluginId = '1234567890'; // Token Vault plugin ID
    const url = `${this.baseUrl}/v1/files/${this.fileId}?plugin_data=${pluginId}`;

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

          // Abort on client errors (except 429) with helpful messages
          if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 403) {
              throw new AbortError(
                `Figma API error (403 Forbidden): Access denied.\n\n` +
                `Possible causes:\n` +
                `  • Your token doesn't have access to this file\n` +
                `  • The token may be invalid or expired\n` +
                `  • The file may be in a team/org you don't have access to\n\n` +
                `Solutions:\n` +
                `  1. Verify you can open this file in Figma with the same account\n` +
                `  2. Generate a new token at https://www.figma.com/settings\n` +
                `  3. Update FIGMA_TOKEN in your .env file`
              );
            }

            if (response.status === 404) {
              throw new AbortError(
                `Figma API error (404 Not Found): File not found.\n\n` +
                `Possible causes:\n` +
                `  • The file ID in your config is incorrect\n` +
                `  • The file has been deleted or moved\n` +
                `  • The file URL format has changed\n\n` +
                `Solutions:\n` +
                `  1. Check the fileId in synkio.config.json\n` +
                `  2. Copy the file ID from your Figma URL:\n` +
                `     https://www.figma.com/design/ABC123xyz/...\n` +
                `                                ^^^^^^^^^^^\n` +
                `  3. Run 'synkio init' to reconfigure`
              );
            }

            throw new AbortError(`Figma API error (${response.status}): ${errorText}`);
          }

          return response.json() as Promise<T>;
        } catch (error: any) {
          clearTimeout(timeoutId);

          // Timeout errors should retry (throw regular Error, not AbortError)
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${this.timeout}ms`);
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
   * Also extracts figmaBaselineHash if present for code sync tracking
   */
  private extractChunkedData(pluginData: Record<string, string>, namespace: string): any {
    // New synkio format uses chunk_X keys
    if (namespace === 'synkio') {
      const chunkCount = pluginData.chunkCount;
      if (chunkCount) {
        const count = Number.parseInt(chunkCount, 10);
        let fullData = '';
        for (let i = 0; i < count; i++) {
          fullData += pluginData[`chunk_${i}`] || '';
        }
        const parsed = JSON.parse(fullData);

        // If the parsed data doesn't include figmaBaselineHash but it's in pluginData,
        // add it to the parsed result for downstream use
        if (!parsed.figmaBaselineHash && pluginData.figmaBaselineHash) {
          parsed.figmaBaselineHash = pluginData.figmaBaselineHash;
        }

        return parsed;
      }
    }

    // Legacy format: single data key
    if (pluginData.data) {
      return JSON.parse(pluginData.data);
    }

    // Legacy format: registry_X keys (token_vault)
    const chunkKeys = Object.keys(pluginData)
      .filter(key => key.startsWith('registry_'))
      .sort((a, b) => a.localeCompare(b));

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
    for (const namespace of FigmaClient.NAMESPACES) {
      if (node.sharedPluginData?.[namespace]) {
        return this.extractChunkedData(node.sharedPluginData[namespace], namespace);
      }
    }

    if (node.children) {
      for (const child of node.children) {
        const result = this.findPluginData(child);
        if (result) return result;
      }
    }

    throw new Error('No plugin data found in file. Run the Synkio plugin in Figma first.');
  }
}
