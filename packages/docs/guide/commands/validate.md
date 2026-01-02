# validate

Check configuration and Figma connection.

## Usage

```bash
npx synkio validate
```

## What It Checks

- Configuration file exists and is valid
- Figma token is set
- Figma file is accessible
- Plugin data is present in the file

## Example Output

```
Validating configuration...

  ✓ Config file found: synkio.config.json
  ✓ Figma token set
  ✓ Figma file accessible
  ✓ Plugin data found (3 collections)

All checks passed!
```

## Troubleshooting

If validation fails:

### "Config file not found"

Run `npx synkio init` to create a configuration file.

### "Figma token not set"

Add your token to `.env`:

```bash
FIGMA_TOKEN=your_token_here
```

### "Figma file not accessible"

Check that:
- The file URL is correct
- Your token has access to the file
- The file hasn't been deleted

### "Plugin data not found"

Run the Synkio plugin in Figma to export variables, or use `synkio import` for native JSON exports.
