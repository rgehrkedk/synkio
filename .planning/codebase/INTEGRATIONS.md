# Integrations

> External services, APIs, and third-party tools

**Generated:** 2026-01-06

---

## Primary Integration: Figma API

**Service:** Figma REST API
**Base URL:** `https://api.figma.com/v1`
**Implementation:** `packages/cli/src/core/figma.ts` (FigmaClient class)

### Authentication
- Bearer token via `X-Figma-Token` header
- Token from `FIGMA_TOKEN` environment variable

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/v1/files/{fileId}/nodes?ids={nodeId}&plugin_data=shared` | Fetch plugin data from specific node |
| `/v1/files/{fileId}/versions?page_size=1` | Connection validation (lightweight check) |
| `/v1/files/{fileId}?plugin_data={pluginId}` | Full file fetch (fallback) |

### HTTP Configuration
- **Client:** Native `fetch` API (no axios/got)
- **Retry:** `p-retry` with exponential backoff (up to 3 retries, 1-4s delays)
- **Rate Limiting:** Handles HTTP 429 with `Retry-After` header
- **Timeout:** 60-120 seconds (configurable, default 120000ms)

### Data Storage
- sharedPluginData namespaces: `synkio` (current), `token_vault` (legacy)
- Chunked data support (`chunk_0`, `chunk_1`, etc.)

---

## Figma Plugin API

**Type:** Embedded plugin (runs inside Figma)
**Location:** `packages/figma-plugin/synkio-v2/`

### Features
- Access to Figma's variable system and styles
- Real-time diff visualization
- Stores data via plugin data API to sharedPluginData
- Uses Figma's native theme variables

---

## Local HTTP Server

**Purpose:** Serve baseline files to Figma plugin during local development
**Implementation:** `packages/cli/src/cli/commands/serve.ts`

### Configuration
- **Server:** Node.js native `http.createServer()`
- **Default Port:** 3847
- **Features:** Optional token-based auth, request logging

---

## Not Integrated

The following services are **not used**:

| Category | Status |
|----------|--------|
| Database | File-based (`synkio/baseline.json`) |
| Authentication | Figma token only |
| Analytics/Monitoring | Not detected |
| Payment Processing | Not applicable |
| Cloud Storage/CDN | Not detected |
| Email/Messaging | Not applicable |
| Message Queues | Not detected |
| Caching (Redis, etc.) | Not detected |
| OAuth/Social Login | Not applicable |

---

## Schema Validation

**Framework:** Zod
**Location:** `packages/cli/src/types/schemas.ts`

### Validated Schemas
- `SynkioTokenEntrySchema` - Individual tokens from Figma
- `SynkioPluginDataSchema` - Complete plugin dataset
- `StyleEntrySchema` - Paint, text, and effect styles
