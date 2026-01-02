# build

Generate token files from `baseline.json`.

The `build` command generates token files from your baseline. It works entirely offline — no Figma API calls required.

## Usage

```bash
npx synkio build
```

## Options

| Flag | Description |
|------|-------------|
| `--force` | Bypass breaking change confirmation |
| `--rebuild` | Regenerate all files (skip comparison) |
| `--backup` | Create timestamped backup before overwriting files |
| `--report` | Generate markdown diff report |
| `--no-report` | Skip report generation |
| `--open` | Open docs folder after build (if docs enabled) |
| `--config=<file>` | Path to config file |

## Examples

```bash
# Build token files from baseline
npx synkio build

# Regenerate all files (after config change)
npx synkio build --rebuild

# Build with backup for safety
npx synkio build --backup

# Force build past breaking changes
npx synkio build --force
```

## How It Works

1. Reads `synkio/baseline.json`
2. Splits tokens according to config strategy
3. Processes styles if configured
4. Writes token files to output directory
5. Generates CSS if enabled
6. Generates docs if enabled
7. Runs `build.script` if configured

## Breaking Change Warning

When baseline contains breaking changes (deletions/renames) compared to existing files, build will show a warning:

```
⚠️  Breaking changes detected

  The following tokens will be removed:
    - colors.accent
    - spacing.small

  Use --force to proceed anyway.
```

Use `--force` to proceed despite warnings.

## Rebuild Mode

Use `--rebuild` to regenerate all output files from existing baseline:

```bash
npx synkio build --rebuild
```

This is useful after:

- Changing `splitBy` strategy
- Modifying collection configuration
- Updating CSS output settings

## Backup Protection

Create timestamped backups before overwriting files:

```bash
npx synkio build --backup
```

Backups are stored in `synkio/backups/{timestamp}/`:

```
synkio/backups/
  └── 2025-12-22T10-29-55/
      └── tokens/
          ├── primitives/primitives.json
          └── semantic/
              ├── semantic.light.json
              └── semantic.dark.json
```

## Build Pipeline

The build command runs these steps in order:

```
baseline.json
     │
     ├──▶ Split by mode/group/none
     │
     ├──▶ Merge styles (if configured)
     │
     ├──▶ Write token JSON files
     │
     ├──▶ Generate CSS (if enabled)
     │
     ├──▶ Generate docs (if enabled)
     │
     └──▶ Run build.script (if configured)
```
