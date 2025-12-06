# @synkio/core

Sync Figma design tokens to code - CLI and programmatic API.

## Installation

```bash
npm install -g @synkio/core
```

## CLI Usage

```bash
# Initialize in your project
synkio init

# Sync tokens from Figma
synkio sync

# Show diff without syncing
synkio diff

# Rollback to previous version
synkio rollback
```

## Programmatic API

```typescript
import { init, fetchFigmaData, compareBaselines } from '@synkio/core/api';

// Initialize
init({ rootDir: process.cwd() });

// Fetch from Figma
const data = await fetchFigmaData({
  fileUrl: 'https://figma.com/file/...',
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

// Compare with local baseline
const diff = await compareBaselines(data, './tokens');
```

## Documentation

See [synkio.io/docs](https://synkio.io/docs) for full documentation.

## License

MIT
