# rollback

Revert to the previous token state.

## Usage

```bash
npx synkio rollback
```

## Options

| Flag | Description |
|------|-------------|
| `--preview` | Show what would be restored without applying |

## Examples

```bash
# Preview rollback
npx synkio rollback --preview

# Perform rollback
npx synkio rollback
```

## Preview Output

```
Rollback Preview - showing changes if restored:

  Value changes (3):
    colors.primary: #0066cc -> #0055aa

  Tokens that would be removed (1):
    - colors.accent

  Tokens that would be restored (2):
    + colors.secondary
```

## How It Works

Synkio maintains a `baseline.prev.json` file containing the previous baseline state. When you run rollback:

1. Current baseline is compared with previous
2. Previous baseline replaces current
3. Run `synkio build` to regenerate files

::: warning
Rollback only affects `baseline.json`. Run `synkio build` afterward to update your token files.
:::
