# diff

Compare `baseline.json` with current token files on disk.

This is a read-only command that shows what would change if you ran `synkio build`. Useful for CI/CD to detect drift between baseline and files.

## Usage

```bash
npx synkio diff
```

## Options

| Flag | Description |
|------|-------------|
| `--config=<file>` | Path to config file |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No differences (baseline and files are in sync) |
| `1` | Differences detected |
| `2` | Error (config, missing files, etc.) |

## Use in CI

Add to your CI pipeline to catch uncommitted token changes:

```yaml
# .github/workflows/check-tokens.yml
name: Check Tokens

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx synkio diff
        # Fails if token files don't match baseline
```

## Example Output

When differences are found:

```
Differences found between baseline and token files:

  Modified:
    tokens/theme.light.json
      - colors.primary: #0066cc -> #0055aa
      + colors.accent: #ff6600

  Missing from files:
    tokens/primitives.json

  Extra files not in baseline:
    tokens/deprecated.json

Run 'synkio build' to update token files.
```
