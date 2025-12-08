/**
 * FigmaClient Tests
 *
 * Focused tests for retry logic and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { FigmaClient } from './client.js';
import { SilentLogger } from '../logger.js';

describe('FigmaClient', () => {
  const mockOptions = {
    fileId: 'test-file-id',
    nodeId: '123:456',
    accessToken: 'test-token',
    logger: new SilentLogger(),
    timeout: 5000,
    maxRetries: 2,
  };

  it('should retry on 500 server errors', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: new Headers({ 'X-Request-Id': 'req-1' }),
          text: async () => 'Internal Server Error',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Request-Id': 'req-2' }),
        json: async () => ({
          nodes: {
            '123:456': {
              document: {
                sharedPluginData: {
                  'io.synkio.token-vault': {
                    data: JSON.stringify({ collections: {} }),
                  },
                },
              },
            },
          },
        }),
      });
    }) as any;

    const client = new FigmaClient(mockOptions);
    const result = await client.fetchData();

    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(result).toEqual({ collections: {} });
  });

  it('should handle 429 rate limiting with retry', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({
            'X-Request-Id': 'req-1',
            'Retry-After': '1',
          }),
          text: async () => 'Rate limited',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Request-Id': 'req-2' }),
        json: async () => ({
          nodes: {
            '123:456': {
              document: {
                sharedPluginData: {
                  'io.synkio.token-vault': {
                    data: JSON.stringify({ collections: {} }),
                  },
                },
              },
            },
          },
        }),
      });
    }) as any;

    const client = new FigmaClient(mockOptions);
    const result = await client.fetchData();

    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(result).toEqual({ collections: {} });
  });
});
