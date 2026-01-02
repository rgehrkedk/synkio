# Introduction

Synkio is a CLI tool that syncs Figma design variables to code without requiring Figma's Enterprise plan.

## The Problem

Figma's Variables REST API is locked behind their Enterprise plan. For teams without Enterprise access, there's no official way to programmatically sync design tokens from Figma to code.

## The Solution

Synkio uses a hybrid approach:

1. **Figma Plugin** — Captures variables and stores them in `sharedPluginData`
2. **CLI Tool** — Fetches this data via Figma's standard API and generates token files

The key innovation is **ID-based diffing** that prevents breaking changes by distinguishing renames from deletions using permanent Figma variable IDs.

## Key Features

- **Breaking Change Protection** — Detects renamed tokens vs deleted tokens
- **DTCG Format** — Outputs W3C Design Token Community Group format
- **Flexible Splitting** — Split by mode, group, or single file
- **Style Dictionary Ready** — Works seamlessly with your existing toolchain
- **GitHub PR Workflow** — Designers can create PRs directly from Figma
- **Import from Figma JSON** — No plugin required for native exports

## How It Works

```
┌─────────────┐     ┌────────────────┐     ┌─────────────┐
│   Figma     │────▶│  sharedPlugin  │────▶│    CLI      │
│  Variables  │     │     Data       │     │   (sync)    │
└─────────────┘     └────────────────┘     └──────┬──────┘
                                                  │
                    ┌────────────────┐            │
                    │  baseline.json │◀───────────┘
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
         ┌────────┐   ┌──────────┐   ┌────────┐
         │ tokens │   │   CSS    │   │  docs  │
         │ *.json │   │ *.css    │   │  site  │
         └────────┘   └──────────┘   └────────┘
```

1. **Configure** — Provide Synkio with your Figma file URL
2. **Plugin** — Run the Synkio Figma plugin to export variables
3. **Pull** — CLI fetches token data and updates `baseline.json`
4. **Build** — CLI generates token files from baseline
5. **Repeat** — Re-run pull + build whenever tokens change

## Next Steps

- [Quick Start](/guide/quick-start) — Get up and running in 5 minutes
- [Commands](/guide/commands/pull) — Learn all available commands
- [Configuration](/guide/configuration) — Customize output format and structure
