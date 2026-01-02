# Breaking Change Protection

Synkio detects changes that could break your code by using permanent Figma variable IDs.

## How It Works

Every Figma variable has a permanent ID (like `VariableID:123:456`). When a variable is renamed, its ID stays the same. Synkio uses these IDs to detect:

| Change | How Detected |
|--------|--------------|
| **Renamed token** | Same ID, different path |
| **Deleted token** | ID no longer exists |
| **New token** | New ID added |
| **Changed value** | Same ID, different value |

## What Synkio Detects

### Path Changes (Renames)

Token renamed in Figma:

```
Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary
```

### Deleted Variables

Token removed from Figma:

```
Breaking changes detected:

  Deleted variables: 2
    - colors.accent
    - spacing.small
```

### Deleted Modes

Mode removed from collection:

```
Breaking changes detected:

  Deleted modes: 1
    - theme/contrast
```

### New Modes

Mode added to collection:

```
Changes detected:

  New modes: 1
    + theme/highContrast
```

### Mode Renames

Mode renamed (detected via mode ID):

```
Breaking changes detected:

  Mode renames: 1
    Mode 1 -> light
```

## During Pull

When pulling detects breaking changes:

1. Baseline is still updated
2. Changes are reported in detail
3. Command exits with code 1

```bash
$ npx synkio pull

Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary

  Deleted variables: 2
    colors.accent
    spacing.small

Baseline updated. Run 'synkio build' to apply to token files.
```

## During Build

When building with breaking changes:

1. Warning is shown
2. Confirmation is requested
3. Use `--force` to bypass

```bash
$ npx synkio build

⚠️  Breaking changes detected

  The following tokens will be removed:
    - colors.accent
    - spacing.small

  Use --force to proceed anyway.
```

## Handling Breaking Changes

### 1. Review the Report

Check `synkio/reports/` for detailed markdown reports.

### 2. Search Your Codebase

Find usages of deleted tokens:

```bash
grep -r "colors.accent" src/
```

### 3. Update Code

Replace deleted token references with new names:

```css
/* Before */
color: var(--colors-accent);

/* After */
color: var(--colors-brand-accent);
```

### 4. Force Build

Once code is updated:

```bash
npx synkio build --force
```

## Best Practices

1. **Review before merging** — Check SYNC_REPORT.md in PRs
2. **Search before building** — Find usages of deleted tokens
3. **Use preview mode** — `synkio pull --preview` to check changes
4. **Create backups** — `synkio build --backup` for safety
5. **Communicate renames** — Document breaking changes for the team

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (no breaking changes) |
| `1` | Breaking changes detected |
| `2` | Error (config, network, etc.) |

Use these in CI to fail builds with breaking changes:

```yaml
- run: npx synkio pull
  continue-on-error: false
```
