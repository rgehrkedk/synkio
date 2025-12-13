import { describe, it, expect } from 'vitest';
import { chunkData, unchunkData } from '../../../src/backend/sync/chunker';
import { CHUNK_SIZE } from '../../../src/backend/utils/constants';

describe('chunkData', () => {
  it('should chunk small data into single chunk', () => {
    const data = { hello: 'world', count: 123 };
    const result = chunkData(data);

    expect(result.chunkCount).toBe(1);
    expect(result.chunks).toHaveLength(1);
    expect(result.totalSize).toBe(JSON.stringify(data).length);
    expect(result.chunks[0]).toBe(JSON.stringify(data));
  });

  it('should split large data into multiple chunks', () => {
    // Create data that will exceed CHUNK_SIZE
    const largeData = {
      items: Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: Math.random(),
        description: 'A'.repeat(100) // Make each item larger
      }))
    };

    const result = chunkData(largeData);

    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.chunks.length).toBe(result.chunkCount);
    expect(result.totalSize).toBe(JSON.stringify(largeData).length);

    // Verify each chunk is under the limit
    result.chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE);
    });

    // Verify total size matches sum of chunk sizes
    const totalChunkSize = result.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    expect(totalChunkSize).toBe(result.totalSize);
  });

  it('should handle empty object', () => {
    const data = {};
    const result = chunkData(data);

    expect(result.chunkCount).toBe(1);
    expect(result.chunks[0]).toBe('{}');
    expect(result.totalSize).toBe(2);
  });

  it('should handle complex nested data', () => {
    const data = {
      collections: {
        colors: {
          light: {
            primary: { $value: '#0000ff', $type: 'color' },
            secondary: { $value: '#ff0000', $type: 'color' }
          },
          dark: {
            primary: { $value: '#00ffff', $type: 'color' },
            secondary: { $value: '#ffff00', $type: 'color' }
          }
        }
      },
      baseline: {
        'var1': { path: 'colors.light.primary', value: '#0000ff', type: 'color' },
        'var2': { path: 'colors.light.secondary', value: '#ff0000', type: 'color' }
      }
    };

    const result = chunkData(data);

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  it('should create chunks at exact boundary', () => {
    // Create data that's exactly CHUNK_SIZE * 2
    const exactData = 'x'.repeat(CHUNK_SIZE * 2);
    const data = { data: exactData };
    const result = chunkData(data);

    // Should split into multiple chunks
    expect(result.chunkCount).toBeGreaterThan(1);
  });
});

describe('unchunkData', () => {
  it('should reassemble single chunk', () => {
    const original = { hello: 'world', count: 123 };
    const chunked = chunkData(original);
    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });

  it('should reassemble multiple chunks correctly', () => {
    const original = {
      items: Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: Math.random(),
        description: 'A'.repeat(100)
      }))
    };

    const chunked = chunkData(original);
    expect(chunked.chunkCount).toBeGreaterThan(1); // Verify we're actually testing multi-chunk

    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });

  it('should handle empty object round-trip', () => {
    const original = {};
    const chunked = chunkData(original);
    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });

  it('should preserve complex nested structures', () => {
    const original = {
      collections: {
        colors: {
          light: {
            primary: { $value: '#0000ff', $type: 'color' },
            secondary: { $value: '#ff0000', $type: 'color' }
          }
        }
      },
      baseline: {
        'var1': { path: 'colors.light.primary', value: '#0000ff', type: 'color' }
      },
      $metadata: {
        version: '2.0.0',
        exportedAt: '2024-01-01T00:00:00Z',
        pluginVersion: '2.0.0'
      }
    };

    const chunked = chunkData(original);
    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });

  it('should throw error for invalid JSON', () => {
    const invalidChunks = ['{ invalid json }'];

    expect(() => unchunkData(invalidChunks)).toThrow('Failed to parse unchunked data');
  });

  it('should handle array data', () => {
    const original = [1, 2, 3, { nested: true }, 'string'];
    const chunked = chunkData(original);
    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });

  it('should preserve data types after round-trip', () => {
    const original = {
      string: 'text',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      object: { nested: 'value' }
    };

    const chunked = chunkData(original);
    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
    expect(typeof (result as any).string).toBe('string');
    expect(typeof (result as any).number).toBe('number');
    expect(typeof (result as any).boolean).toBe('boolean');
    expect((result as any).null).toBeNull();
    expect(Array.isArray((result as any).array)).toBe(true);
    expect(typeof (result as any).object).toBe('object');
  });
});

describe('chunking integration', () => {
  it('should maintain data integrity for very large datasets', () => {
    // Create a dataset large enough to require many chunks
    const original = {
      collections: Array.from({ length: 100 }, (_, i) => ({
        id: `collection-${i}`,
        name: `Collection ${i}`,
        variables: Array.from({ length: 100 }, (_, j) => ({
          id: `var-${i}-${j}`,
          name: `Variable ${j}`,
          value: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          type: 'color'
        }))
      }))
    };

    const chunked = chunkData(original);

    // Verify we created multiple chunks for this large dataset
    expect(chunked.chunkCount).toBeGreaterThan(1);

    const result = unchunkData(chunked.chunks);

    expect(result).toEqual(original);
  });
});
