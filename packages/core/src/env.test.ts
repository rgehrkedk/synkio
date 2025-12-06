/**
 * Environment Loading Tests
 *
 * Unit tests for lazy environment variable loading.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadEnv, getFigmaToken, resetEnv } from './env';

describe('Environment Loading', () => {
  beforeEach(() => {
    // Clear environment variables and reset env state
    delete process.env.FIGMA_ACCESS_TOKEN;
    delete process.env.FIGMA_TOKEN;
    resetEnv();
  });

  it('should load .env file with correct priority', () => {
    process.env.FIGMA_ACCESS_TOKEN = 'token-from-env';

    const token = getFigmaToken();
    expect(token).toBe('token-from-env');
  });

  it('should prefer FIGMA_ACCESS_TOKEN over FIGMA_TOKEN', () => {
    process.env.FIGMA_ACCESS_TOKEN = 'access-token';
    process.env.FIGMA_TOKEN = 'token';

    const token = getFigmaToken();
    expect(token).toBe('access-token');
  });

  it('should cache loaded environment variables', () => {
    process.env.FIGMA_ACCESS_TOKEN = 'cached-token';

    loadEnv();
    const token1 = getFigmaToken();

    // Calling getFigmaToken again should use cached value
    const token2 = getFigmaToken();
    expect(token1).toBe(token2);
    expect(token1).toBe('cached-token');
  });

  it('should allow multiple loadEnv calls without side effects', () => {
    process.env.FIGMA_ACCESS_TOKEN = 'test-token';

    loadEnv();
    loadEnv();
    loadEnv();

    const token = getFigmaToken();
    expect(token).toBe('test-token');
  });
});
