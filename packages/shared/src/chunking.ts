/**
 * Chunking utilities for Figma plugin data storage
 * Figma has 100KB limit per key
 */

const MAX_CHUNK_SIZE = 90000;

export function chunkData(data: string, maxSize = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += maxSize) {
    chunks.push(data.slice(i, i + maxSize));
  }
  return chunks;
}

export function reassembleChunks(
  getChunk: (index: number) => string,
  count: number
): string {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += getChunk(i);
  }
  return result;
}
