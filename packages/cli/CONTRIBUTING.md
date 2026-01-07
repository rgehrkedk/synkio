# Contributing to Synkio

Thanks for your interest in contributing to Synkio! This document provides guidelines for contributing to the project.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/rgehrkedk/synkio.git
   cd synkio
   ```

2. Install dependencies:
   ```bash
   cd packages/cli
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

4. Link for local testing:
   ```bash
   npm link
   synkio --version
   ```

## Project Structure

```
packages/cli/
├── src/
│   ├── cli/           # Command implementations
│   ├── core/          # Core business logic
│   ├── types/         # Zod schemas and TypeScript types
│   └── utils/         # Shared utilities
├── CHANGELOG.md       # Version history
├── README.md          # Package documentation
└── USER_GUIDE.md      # Detailed usage guide
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npm run test -- src/core/compare/compare.test.ts
```

### Building

```bash
# Build once
npm run build

# Watch mode (rebuild on changes)
npm run dev
```

### Testing Locally

After building, use one of these approaches:

```bash
# Link globally
npm link
synkio pull

# Or run directly
node dist/cli/bin.js pull
```

## Pull Request Guidelines

1. **Fork and branch**: Create a feature branch from `main`
2. **Write tests**: Add tests for new functionality
3. **Follow conventions**: Match existing code style
4. **Update docs**: Update README/USER_GUIDE if needed
5. **Keep commits atomic**: One logical change per commit

### Commit Message Format

Use conventional commits:

```
feat: add new command for X
fix: resolve issue with Y
docs: update README with Z
refactor: simplify token parsing
test: add tests for comparison logic
```

## Code Style

- TypeScript strict mode enabled
- ES modules (`type: "module"`)
- Zod for runtime validation
- Tests alongside implementation files (`*.test.ts`)

## Reporting Issues

When reporting bugs, please include:

1. Synkio version (`synkio --version`)
2. Node.js version (`node --version`)
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Relevant config (sanitize tokens/secrets)

## Feature Requests

Open an issue with:

1. Clear description of the feature
2. Use case / problem it solves
3. Proposed API or behavior (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
