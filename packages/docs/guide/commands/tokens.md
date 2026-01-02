# tokens

Debug utility to view current baseline.

## Usage

```bash
npx synkio tokens
```

## What It Shows

Displays the current baseline in a readable format:

- Collections and their modes
- Token counts per collection
- Sample token values
- Style information (if present)

## Example Output

```
Current baseline:

  theme (2 modes)
    ├── light (45 tokens)
    └── dark (45 tokens)

  primitives (1 mode)
    └── default (128 tokens)

  Sample tokens:
    theme.light.colors.primary: #0066cc
    theme.dark.colors.primary: #4d9fff
    primitives.default.spacing.md: 16

  Styles:
    paint: 12 styles
    text: 8 styles
```

::: tip
Use this command to verify your baseline after pulling or to debug configuration issues.
:::
