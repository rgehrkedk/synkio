# Changelog

All notable changes to Synkio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Zod Schema Validation** - Type-safe configuration validation with actionable error messages
  - Strict validation catches typos and misconfigurations early
  - Semver validation for version field
  - Clear error messages guide users to fix issues

- **Resilient Figma API Client** - Automatic retry on transient failures
  - Exponential backoff (1s, 2s, 4s) with jitter to prevent thundering herd
  - Automatic retry on 429 rate limits and 5xx server errors
  - Smart abort on 4xx client errors (no wasted retries)
  - 30-second timeout protection with AbortSignal
  - Request ID extraction for debugging support

- **Structured Logger System** - Testable, maintainable logging
  - ConsoleLogger for production with clean output
  - SilentLogger for tests (no console pollution)
  - DEBUG=1 environment variable for verbose mode
  - Metadata support for structured logging
  - Context integration for consistent access

- **Troubleshooting Documentation** - Comprehensive guide for common issues
  - Figma API error handling (rate limits, timeouts, auth)
  - Configuration validation errors
  - Debug mode usage
  - Network troubleshooting

### Improved

- **Code Quality** - Improved maintainability and reliability
  - Reduced defensive null checks with Zod guarantees
  - Centralized error handling in FigmaClient
  - Test-friendly architecture with SilentLogger
  - Consistent logging patterns in sync command

- **Developer Experience** - Better error messages and debugging
  - Zod provides precise validation errors
  - Request IDs in error messages for Figma support
  - DEBUG mode shows retry attempts and API details
  - Clearer authentication error guidance

### Changed

- **Breaking**: Context.logger is now required (auto-created if not provided)
- Config validation now uses Zod instead of manual checks
- Figma API calls now go through FigmaClient with retry logic
- Sync command uses ctx.logger instead of console statements

### Technical Details

- Reduced sync-cmd.ts console statements: 31 → 0
- Added focused unit tests for FigmaClient retry behavior
- Logger system enables clean test runs
- Net LOC impact: Improved code quality with focused additions

## [1.0.5] - Previous

See Git history for previous changes.

---

## Migration Guide

### From 1.0.x to 1.1.0

**No breaking changes for end users.** All changes are internal improvements.

**For contributors/library consumers:**

If you use `createContext()` programmatically:
- Logger is now required in Context (was optional)
- Auto-created as ConsoleLogger if not provided
- Pass `logger: new SilentLogger()` in tests

Example:
```typescript
// Before (optional logger)
const ctx = createContext({ rootDir: '.' });
ctx.logger?.info('message'); // Optional chaining required

// After (required logger)
const ctx = createContext({ rootDir: '.' }); // Auto-creates ConsoleLogger
ctx.logger.info('message'); // No optional chaining needed

// In tests
const ctx = createContext({
  rootDir: '.',
  logger: new SilentLogger()
});
```

---

[Unreleased]: https://github.com/rgehrkedk/synkio/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/rgehrkedk/synkio/releases/tag/v1.0.5
