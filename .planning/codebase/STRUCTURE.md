# Structure

> Directory layout and file organization

**Generated:** 2026-01-06

---

## Repository Layout

```
synkio/
├── packages/
│   ├── cli/                        # Main npm package (synkio)
│   │   ├── src/
│   │   │   ├── cli/               # Command implementations
│   │   │   │   ├── bin.ts         # Entry point, command dispatcher
│   │   │   │   ├── utils.ts       # CLI utilities
│   │   │   │   └── commands/      # Individual commands
│   │   │   │       ├── pull.ts
│   │   │   │       ├── build.ts
│   │   │   │       ├── diff.ts
│   │   │   │       ├── init.ts
│   │   │   │       ├── init-baseline.ts
│   │   │   │       ├── import.ts
│   │   │   │       ├── export-baseline.ts
│   │   │   │       ├── serve.ts
│   │   │   │       ├── docs.ts
│   │   │   │       ├── validate.ts
│   │   │   │       └── rollback.ts
│   │   │   │
│   │   │   ├── core/              # Business logic
│   │   │   │   ├── baseline.ts    # Baseline read/write
│   │   │   │   ├── config.ts      # Config loading
│   │   │   │   ├── figma.ts       # FigmaClient
│   │   │   │   ├── tokens.ts      # Token normalization
│   │   │   │   │
│   │   │   │   ├── compare/       # Comparison engine
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── collection-matcher.ts
│   │   │   │   │   ├── variable-comparator.ts
│   │   │   │   │   ├── path-comparison.ts
│   │   │   │   │   ├── utils.ts
│   │   │   │   │   ├── report-generator.ts
│   │   │   │   │   └── console-display.ts
│   │   │   │   │
│   │   │   │   ├── sync/          # Sync pipeline
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── pipeline.ts
│   │   │   │   │   ├── file-writer.ts
│   │   │   │   │   ├── breaking-changes.ts
│   │   │   │   │   ├── style-merger.ts
│   │   │   │   │   ├── build-runner.ts
│   │   │   │   │   └── display.ts
│   │   │   │   │
│   │   │   │   ├── tokens/        # Token processing
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── split-strategies.ts
│   │   │   │   │   ├── reference-resolver.ts
│   │   │   │   │   ├── token-builder.ts
│   │   │   │   │   └── filename-generator.ts
│   │   │   │   │
│   │   │   │   ├── import/        # Import workflow
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── parser.ts
│   │   │   │   │   ├── validator.ts
│   │   │   │   │   ├── source-resolver.ts
│   │   │   │   │   └── file-generator.ts
│   │   │   │   │
│   │   │   │   ├── export/        # Export workflow
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── file-discoverer.ts
│   │   │   │   │   ├── token-parser.ts
│   │   │   │   │   └── baseline-builder.ts
│   │   │   │   │
│   │   │   │   ├── docs/          # Documentation generator
│   │   │   │   │   └── components/
│   │   │   │   │
│   │   │   │   ├── css/           # CSS generation
│   │   │   │   │
│   │   │   │   └── utils/         # Core utilities
│   │   │   │       ├── collection-discovery.ts
│   │   │   │       ├── deep-merge.ts
│   │   │   │       └── nested-set.ts
│   │   │   │
│   │   │   ├── types/             # Type definitions
│   │   │   │   ├── index.ts
│   │   │   │   └── schemas.ts
│   │   │   │
│   │   │   └── utils/             # Top-level utilities
│   │   │       ├── figma.ts
│   │   │       └── logger.ts
│   │   │
│   │   ├── dist/                  # Compiled output
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── USER_GUIDE.md
│   │
│   └── figma-plugin/
│       └── synkio-v2/             # Figma plugin
│           ├── src/
│           │   ├── code.ts        # Plugin handler
│           │   ├── handlers/
│           │   ├── operations/
│           │   ├── screens/
│           │   ├── ui/
│           │   │   ├── components/
│           │   │   ├── layout/
│           │   │   └── styles/
│           │   ├── lib/
│           │   └── utils/
│           ├── manifest.json
│           └── package.json
│
├── examples/
│   ├── demo-app/                  # Full integration example
│   ├── starter-app/               # Minimal template
│   ├── import-demo/               # Import workflow
│   └── export-baseline-demo/      # Code→Figma workflow
│
├── synkio.config.json             # Project configuration
└── CLAUDE.md                      # AI assistant guidance
```

---

## Key Locations

| Task | Location |
|------|----------|
| Add new command | `src/cli/commands/{name}.ts` + register in `bin.ts` |
| Modify comparison | `src/core/compare/*.ts` |
| Change token format | `src/core/tokens.ts` or `tokens/split-strategies.ts` |
| Add token type | `src/types/schemas.ts` + update `tokens.ts` |
| Modify output files | `src/core/sync/file-writer.ts` |
| Custom build script | `src/core/sync/build-runner.ts` |
| Config validation | `src/core/config.ts` |
| Figma integration | `src/core/figma.ts` |

---

## Naming Conventions

**Files:**
- kebab-case for modules: `file-writer.ts`, `collection-matcher.ts`
- kebab-case for commands: `init-baseline.ts`, `export-baseline.ts`
- Index files for barrel exports: `index.ts`
- Test suffix: `*.test.ts`

**Directories:**
- kebab-case: `core/compare/`, `core/import/`
- Plural for collections: `commands/`, `types/`, `utils/`

---

## Output Directories

**Build Output:**
- `packages/cli/dist/` - Compiled CLI
- `packages/figma-plugin/synkio-v2/dist/` - Plugin bundle

**Runtime Output (user project):**
- `synkio/` - Default output directory
- `synkio/baseline.json` - Source of truth
- `synkio/compare/` - Comparison snapshots
- `synkio/docs/` - Generated documentation
