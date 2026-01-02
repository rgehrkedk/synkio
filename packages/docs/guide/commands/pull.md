# pull

Fetch tokens from Figma and update `baseline.json`.

The `pull` command fetches token data from Figma and updates your local baseline. It does **not** write token files — run `synkio build` after pulling to generate output files.

## Usage

```bash
npx synkio pull
```

## Options

| Flag | Description |
|------|-------------|
| `--preview` | Show changes without updating baseline |
| `--collection=<name>` | Pull specific collection(s), comma-separated |
| `--watch` | Poll Figma for changes continuously |
| `--interval=<s>` | Watch interval in seconds (default: 30) |
| `--timeout=<s>` | Figma API timeout in seconds (default: 120) |
| `--config=<file>` | Path to config file |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (no breaking changes) |
| `1` | Breaking changes detected |
| `2` | Error (config, network, etc.) |

## Examples

```bash
# Fetch from Figma, update baseline
npx synkio pull

# Preview changes without updating
npx synkio pull --preview

# Watch mode with 60s interval
npx synkio pull --watch --interval=60

# Pull only theme collection
npx synkio pull --collection=theme

# Pull multiple collections
npx synkio pull --collection=theme,base
```

## Breaking Changes

When pulling detects breaking changes (deletions, renames), the baseline is still updated but the command exits with code 1:

```
Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary

  Run 'synkio build' to apply to token files.
```

::: tip
Use `synkio build --force` to apply changes despite warnings.
:::

## Watch Mode

Continuously poll Figma for changes:

```bash
npx synkio pull --watch
```

Output:

```
Watching for changes (every 30s)

  Press Ctrl+C to stop

  [10:30:30] Checking Figma... No changes
  [10:31:00] Checking Figma... Changes detected!

  Baseline updated.
  Run 'synkio build' to generate token files.
```

## Selective Pull

Pull specific collections only:

```bash
npx synkio pull --collection=theme,base,icons
```

Useful for large design systems where you only need certain collections.
