# Stack

> Technologies, dependencies, and runtime environment

**Generated:** 2026-01-06

---

## Languages

**Primary:**
- TypeScript 5.0+ - All application code (`packages/cli/src/**/*.ts`)

**Secondary:**
- JavaScript - Build scripts (`packages/figma-plugin/synkio-v2/build.js`)
- HTML/CSS - Plugin UI and documentation

---

## Runtime

- **Node.js** >= 18.0.0 - `packages/cli/package.json` (engines field)
- **Module System:** ES modules (`"type": "module"`)

---

## Package Manager

- **npm** with `package-lock.json`
- Lockfiles in root, CLI, plugin, website, and docs packages

---

## Frameworks & Build Tools

| Tool | Version | Purpose | Location |
|------|---------|---------|----------|
| TypeScript | 5.0+ | Compiler | `packages/cli/tsconfig.json` |
| esbuild | 0.24+ | Figma plugin bundling | `packages/figma-plugin/synkio-v2/build.js` |
| Vite | 5.4+ | Website/demo builds | `packages/website/vite.config.ts` |
| VitePress | 1.5+ | Documentation site | `packages/docs/package.json` |
| Vitest | 2.0+ | Testing framework | `packages/cli/vitest.config.ts` |

---

## Key Dependencies

### CLI Package (`packages/cli/package.json`)

**Production:**
| Package | Version | Purpose |
|---------|---------|---------|
| chalk | 5.0+ | Terminal styling/colors |
| dotenv | 17.2+ | Environment variable loading |
| ora | 8.0+ | CLI spinners and progress |
| p-retry | 7.1+ | Retry with exponential backoff |
| tsx | 4.21+ | TypeScript execution |
| zod | 3.25+ | Schema validation |

**Development:**
| Package | Version | Purpose |
|---------|---------|---------|
| @types/node | 22.0+ | TypeScript definitions |
| style-dictionary | 5.1+ | DTCG token processing |
| typescript | 5.0+ | Compiler |

### Figma Plugin (`packages/figma-plugin/synkio-v2/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| @figma/plugin-typings | 1.100+ | Figma plugin API types |
| esbuild | 0.24+ | Bundler |
| typescript | 5.7+ | Compiler |

---

## Configuration

### Config Files
- `synkio.config.json` - Primary (W3C DTCG format)
- `tokensrc.json` - Legacy (deprecated, still supported)
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Excludes .env, dist, node_modules

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `FIGMA_TOKEN` | Yes | Figma personal access token |
| `DEBUG` | No | Set to "synkio" for debug output |

Loaded via `dotenv/config` in `packages/cli/src/cli/bin.ts`

---

## Platform

- **Target:** Cross-platform (macOS, Linux, Windows)
- **Distribution:** npm package (`synkio`)
- **Executable:** `dist/cli/bin.js` (via npm bin)
