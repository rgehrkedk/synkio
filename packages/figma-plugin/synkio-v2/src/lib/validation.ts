// =============================================================================
// JSON Validation Utilities
// =============================================================================

import { BaselineData, BaselineEntry, StyleBaselineEntry } from './types';

/**
 * Custom error class for validation failures.
 * Provides user-friendly messages with optional field context.
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates and parses baseline data from external JSON.
 * Throws ValidationError if the data is malformed.
 *
 * @param content - Raw JSON string to parse and validate
 * @returns Validated BaselineData object
 * @throws ValidationError if parsing fails or data is invalid
 */
export function validateBaselineData(content: string): BaselineData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new ValidationError(
      'Invalid JSON: The file does not contain valid JSON data. ' +
        'Please ensure you are fetching the correct file.'
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError(
      'Invalid format: Expected a JSON object but received ' +
        (parsed === null ? 'null' : typeof parsed)
    );
  }

  const data = parsed as Record<string, unknown>;

  // Validate required baseline field
  if (!data.baseline) {
    throw new ValidationError(
      'Invalid baseline format: Missing "baseline" field. ' +
        'This file may not be a valid Synkio baseline file.',
      'baseline'
    );
  }

  if (typeof data.baseline !== 'object' || data.baseline === null) {
    throw new ValidationError(
      'Invalid baseline format: "baseline" must be an object.',
      'baseline'
    );
  }

  // Validate baseline entries have required fields
  const baseline = data.baseline as Record<string, unknown>;
  const entryKeys = Object.keys(baseline);

  if (entryKeys.length > 0) {
    const sampleKey = entryKeys[0];
    const sampleEntry = baseline[sampleKey] as Record<string, unknown>;

    if (!sampleEntry || typeof sampleEntry !== 'object') {
      throw new ValidationError(
        'Invalid baseline entry: Entries must be objects.',
        'baseline entries'
      );
    }

    const requiredFields = ['path', 'collection', 'mode', 'type'];
    const missingFields = requiredFields.filter((f) => !(f in sampleEntry));

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Invalid baseline entry: Missing required fields: ${missingFields.join(', ')}. ` +
          'The file may be from an incompatible Synkio version.',
        'baseline entries'
      );
    }
  }

  // Validate optional styles field if present
  if (data.styles !== undefined) {
    if (typeof data.styles !== 'object' || data.styles === null) {
      throw new ValidationError(
        'Invalid baseline format: "styles" must be an object if present.',
        'styles'
      );
    }
  }

  // Validate metadata if present
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || data.metadata === null) {
      throw new ValidationError(
        'Invalid baseline format: "metadata" must be an object if present.',
        'metadata'
      );
    }
  }

  return {
    baseline: data.baseline as Record<string, BaselineEntry>,
    styles: data.styles as Record<string, StyleBaselineEntry> | undefined,
    metadata: (data.metadata as BaselineData['metadata']) || {
      syncedAt: new Date().toISOString(),
    },
  };
}

/**
 * Checks if an error is a ValidationError.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
