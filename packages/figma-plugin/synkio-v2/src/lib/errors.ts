// =============================================================================
// User-Friendly Error Formatting
// =============================================================================

interface ErrorMapping {
  pattern: RegExp;
  userMessage: string;
  action?: string;
}

/**
 * Known error patterns mapped to user-friendly messages.
 */
const ERROR_MAPPINGS: ErrorMapping[] = [
  // Network errors
  {
    pattern: /Failed to fetch|NetworkError|net::ERR_|ECONNREFUSED/i,
    userMessage: 'Network connection failed',
    action: 'Check your internet connection and try again.',
  },

  // GitHub authentication
  {
    pattern: /401|Unauthorized|Bad credentials/i,
    userMessage: 'GitHub authentication failed',
    action: 'Your token may be invalid or expired. Generate a new token at github.com/settings/tokens.',
  },

  // GitHub permissions
  {
    pattern: /403|Forbidden|Resource not accessible/i,
    userMessage: 'Permission denied',
    action: 'Ensure your GitHub token has the required permissions (repo or contents:write).',
  },

  // Not found
  {
    pattern: /404|Not Found|does not exist/i,
    userMessage: 'Resource not found',
    action: 'Verify the repository, branch, and file path are correct.',
  },

  // Rate limiting
  {
    pattern: /429|rate limit|Too Many Requests/i,
    userMessage: 'GitHub rate limit exceeded',
    action: 'Wait a few minutes before trying again. Using a token increases your rate limit.',
  },

  // JSON parsing
  {
    pattern: /JSON\.parse|Unexpected token|JSON at position|SyntaxError.*JSON/i,
    userMessage: 'Invalid file format',
    action: 'The file does not contain valid JSON. Verify you are using the correct file.',
  },

  // Figma variable errors
  {
    pattern: /createVariable|Variable.*failed|variable.*null/i,
    userMessage: 'Could not create Figma variable',
    action: 'Check that the variable name is valid and you have not reached plan limits.',
  },

  // Figma collection errors
  {
    pattern: /createVariableCollection|Collection.*failed/i,
    userMessage: 'Could not create Figma collection',
    action: 'Figma Free plans support limited modes per collection. Consider upgrading for more.',
  },

  // Figma mode errors
  {
    pattern: /addMode|mode limit|modes.*exceeded/i,
    userMessage: 'Could not add mode to collection',
    action: 'You may have reached the mode limit for your Figma plan.',
  },

  // Generic property access errors
  {
    pattern: /Cannot read propert|undefined is not|null is not|TypeError/i,
    userMessage: 'Unexpected data format',
    action: 'The response from the server was incomplete. Please try again.',
  },

  // Timeout
  {
    pattern: /timeout|timed out|ETIMEDOUT/i,
    userMessage: 'Request timed out',
    action: 'The server took too long to respond. Please try again.',
  },
];

/**
 * Converts a raw error to a user-friendly message with actionable guidance.
 *
 * @param error - The error to format (can be Error, string, or unknown)
 * @returns A user-friendly error message
 */
export function formatUserError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  // Check for known error patterns
  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.pattern.test(rawMessage)) {
      let result = mapping.userMessage;
      if (mapping.action) {
        result += `\n\n${mapping.action}`;
      }
      return result;
    }
  }

  // For unknown errors, provide a sanitized version
  // Remove technical details but keep the core message
  const sanitized = rawMessage
    .replace(/Error:\s*/gi, '')
    .replace(/at\s+\w+\s+\([^)]+\)/g, '') // Remove stack trace lines
    .replace(/https?:\/\/[^\s]+/g, '[URL]') // Hide URLs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return sanitized || 'An unexpected error occurred. Please try again.';
}

/**
 * Creates an error message with context.
 *
 * @param context - What operation was being attempted
 * @param error - The error that occurred
 * @returns Formatted error message with context
 */
export function formatContextualError(context: string, error: unknown): string {
  const formatted = formatUserError(error);
  return `${context}: ${formatted}`;
}

/**
 * Error codes for common scenarios.
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_JSON: 'INVALID_JSON',
  FIGMA_VARIABLE_ERROR: 'FIGMA_VARIABLE_ERROR',
  FIGMA_COLLECTION_ERROR: 'FIGMA_COLLECTION_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Determines the error code from an error.
 *
 * @param error - The error to classify
 * @returns The corresponding error code
 */
export function getErrorCode(error: unknown): ErrorCode {
  const message = error instanceof Error ? error.message : String(error);

  if (/Failed to fetch|NetworkError|net::ERR_/i.test(message)) {
    return ErrorCodes.NETWORK_ERROR;
  }
  if (/401|Unauthorized|Bad credentials/i.test(message)) {
    return ErrorCodes.AUTH_FAILED;
  }
  if (/403|Forbidden/i.test(message)) {
    return ErrorCodes.PERMISSION_DENIED;
  }
  if (/404|Not Found/i.test(message)) {
    return ErrorCodes.NOT_FOUND;
  }
  if (/429|rate limit/i.test(message)) {
    return ErrorCodes.RATE_LIMITED;
  }
  if (/JSON\.parse|Unexpected token/i.test(message)) {
    return ErrorCodes.INVALID_JSON;
  }
  if (/timeout|timed out/i.test(message)) {
    return ErrorCodes.TIMEOUT;
  }
  if (/createVariable|Variable.*failed/i.test(message)) {
    return ErrorCodes.FIGMA_VARIABLE_ERROR;
  }
  if (/createVariableCollection|Collection.*failed/i.test(message)) {
    return ErrorCodes.FIGMA_COLLECTION_ERROR;
  }

  return ErrorCodes.UNKNOWN;
}
