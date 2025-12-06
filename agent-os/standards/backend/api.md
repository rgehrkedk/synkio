## API endpoint standards and conventions

### Programmatic API (@synkio/core/api)
The core package exports a programmatic API for use in Next.js, Remix, and other Node.js environments.

**Design Principles:**
- **Simple Functions**: Export simple, well-typed functions (not classes or complex objects)
- **No Side Effects**: Functions should not have side effects at import time
- **Context Initialization**: Require explicit `init()` call before using API functions
- **Error Handling**: Throw typed errors with helpful messages
- **Type Safety**: Full TypeScript support with exported types
- **Framework Agnostic**: Works in any Node.js environment (Next.js, Remix, Express, etc.)

**API Function Conventions:**
```typescript
// Good: Simple, explicit, well-typed
export async function fetchFigmaData(options: FetchOptions): Promise<BaselineData>
export async function compareBaselines(current: BaselineData, previous: BaselineData): Promise<DiffReport>
export function splitTokens(data: BaselineData, config: TokensConfig): SplitResult

// Bad: Complex, unclear, side effects
export class FigmaSync { /* ... */ }
export default function() { /* ... */ }
```

**Usage Pattern:**
```typescript
import { init, fetchFigmaData } from '@synkio/core/api'

// Initialize context (once per process)
init({ rootDir: process.cwd() })

// Use API functions
const data = await fetchFigmaData({ fileUrl, accessToken })
```

### Dashboard API Routes (Next.js App Router)
When the dashboard is built, follow these conventions:

- **RESTful Design**: Follow REST principles with clear resource-based URLs and appropriate HTTP methods
- **Route Naming**: Use kebab-case for route segments (e.g., `/api/token-sync/preview`)
- **Versioning**: Not needed yet (0.x version); add when stable
- **Error Responses**: Return JSON with `{ success: false, error: "message" }` format
- **HTTP Status Codes**: Return appropriate status codes (200, 201, 400, 404, 500, etc.)
- **Type Safety**: Share types between frontend and backend via `@synkio/core`
