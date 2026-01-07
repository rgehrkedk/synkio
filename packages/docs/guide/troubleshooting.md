# Troubleshooting

Common issues and solutions for Synkio.

## Quick Diagnostics

Run `synkio validate` to check your setup:

```bash
npx synkio validate
```

This checks:
- Configuration file exists and is valid
- Figma token is set
- Figma file is accessible
- Plugin data is present

---

## Configuration Issues

### "Config file not found"

**Error:** `Error: Config file not found`

**Solution:** Run `synkio init` to create a configuration file:

```bash
npx synkio init
```

Or create `synkio.config.json` manually:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "YOUR_FILE_ID",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens"
  }
}
```

### "Invalid JSON syntax"

**Error:** `Failed to parse config file: Unexpected token...`

**Cause:** JSON syntax error in your config file.

**Common mistakes:**
- Missing closing braces `}` or brackets `]`
- Trailing commas after the last item
- Missing commas between properties
- Using single quotes instead of double quotes

**Solution:** Use a JSON validator or run:

```bash
npx synkio validate
```

### Collection names don't match

**Symptom:** No tokens synced for a collection configured in your config.

**Cause:** Collection names are case-sensitive and must match Figma exactly.

**Solution:**

1. Check your Figma file's Variables panel for exact names
2. Run `synkio pull --preview` to see detected collections
3. Update your config to match exactly (including spaces and capitalization)

```json
// Figma has "Brand Colors" - must match exactly
"collections": {
  "Brand Colors": { "splitBy": "mode" }  // ✓ Correct
  "brand-colors": { "splitBy": "mode" }  // ✗ Won't match
}
```

---

## Figma Connection Issues

### "FIGMA_TOKEN environment variable is not set"

**Error:** `Error: FIGMA_TOKEN environment variable is not set`

**Solution:**

1. Create a `.env` file in your project root:

```bash
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
```

2. Make sure `.env` is in the same directory where you run synkio commands:

```
my-project/
├── .env              ✓ Correct location
├── synkio.config.json
└── tokens/
```

3. Get your token from [Figma Account Settings](https://www.figma.com/settings) → Personal access tokens

### "403 Forbidden: Access denied"

**Error:**
```
Figma API error (403 Forbidden): Access denied.

Possible causes:
  • Your token doesn't have access to this file
  • The token may be invalid or expired
  • The file may be in a team/org you don't have access to
```

**Solutions:**

1. **Verify token access:**
   - Ensure you have "view" access to the Figma file
   - Try accessing the file in Figma with the same account

2. **Regenerate token:**
   - Go to [Figma Settings](https://www.figma.com/settings) → Personal access tokens
   - Generate a new token
   - Update your `.env` file

3. **Check team/org access:**
   - If the file is in a team or organization, ensure your account has access
   - Ask the file owner to share it with you

### "404 Not Found: File not found"

**Error:**
```
Figma API error (404 Not Found): File not found.

Possible causes:
  • The file ID in your config is incorrect
  • The file has been deleted or moved
  • The file URL format has changed
```

**Solutions:**

1. **Check the fileId in synkio.config.json:**
   ```json
   {
     "figma": {
       "fileId": "ABC123xyz"  // ← Verify this is correct
     }
   }
   ```

2. **Copy the file ID from your Figma URL:**
   ```
   https://www.figma.com/design/ABC123xyz/My-Design-System
                                ^^^^^^^^^^
                                This is your fileId
   ```

3. **Run `synkio init` to reconfigure** if you need to set up a new file.

### "Request timeout"

**Error:** `Error: Request timed out after 120000ms`

**Cause:** Large Figma file or slow network connection.

**Solutions:**

1. **Increase timeout:**
   ```json
   {
     "figma": {
       "timeout": 180000
     }
   }
   ```

2. **Sync specific collections:**
   ```bash
   npx synkio pull --collection=theme
   ```

3. **Check network connectivity**

---

## Plugin Data Issues

### "No plugin data found"

**Error:** `Warning: No Synkio plugin data found in file`

**Cause:** The Synkio Figma plugin hasn't exported data to the file.

**Solutions:**

1. **Run the plugin:**
   - Open your Figma file
   - Run **Plugins → Synkio**
   - Click "Sync" or "Prepare for Sync"

2. **Use import workflow instead:**
   ```bash
   # Export from Figma: File → Export → Variables → JSON
   npx synkio import ./figma-export.json --collection=theme
   ```

3. **Check plugin version:**
   - Ensure you have the latest Synkio plugin installed
   - Re-run the plugin if you've updated it

### "Phantom modes appearing in output"

**Symptom:** Extra modes in your token files that don't exist in Figma.

**Cause:** Figma API can return stale mode data in some cases.

**Solution:** Synkio automatically filters phantom modes. If you still see them:

1. Re-run the Figma plugin to refresh data
2. Pull again: `npx synkio pull`
3. If persists, report the issue with your baseline.json

---

## Breaking Change Issues

### "Breaking changes detected"

**Message:**
```
Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary
```

**Meaning:** A token was renamed or restructured in Figma.

**Options:**

1. **Review and apply:**
   ```bash
   npx synkio build --force
   ```

2. **Update your code first:**
   - Find usages of the old token path
   - Update to the new path
   - Then run build with force

3. **Preview changes:**
   ```bash
   npx synkio pull --preview
   ```

### "Deleted variables detected"

**Meaning:** Variables were removed in Figma that exist in your baseline.

**Options:**

1. **Accept deletions:**
   ```bash
   npx synkio build --force
   ```

2. **Check if accidental:**
   - Verify in Figma that the deletions were intentional
   - The variable ID tracking ensures renames aren't flagged as deletions

---

## Build Issues

### "Token files not generating"

**Symptom:** `synkio build` runs but no files appear.

**Possible causes:**

1. **No baseline exists:**
   ```bash
   # Pull first to create baseline
   npx synkio pull
   npx synkio build
   ```

2. **Wrong output directory:**
   - Check `tokens.dir` in your config
   - Ensure the directory path is correct

3. **Collection filter active:**
   ```bash
   # Build all collections
   npx synkio build

   # Not just specific ones
   npx synkio build --collection=theme
   ```

### "CSS not generating"

**Symptom:** Token JSON files generate but no CSS output.

**Solution:** Enable CSS in your config:

```json
{
  "build": {
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "tokens.css"
    }
  }
}
```

Then rebuild:

```bash
npx synkio build --rebuild
```

### "Build script not running"

**Symptom:** Custom build script defined but not executing.

**Check:**

1. **Script is defined:**
   ```json
   {
     "build": {
       "script": "npm run build:tokens"
     }
   }
   ```

2. **Script exists in package.json:**
   ```json
   {
     "scripts": {
       "build:tokens": "style-dictionary build"
     }
   }
   ```

3. **Run build explicitly:**
   ```bash
   npx synkio build
   # Build script runs after token generation
   ```

---

## Import Issues

### "Invalid Figma export format"

**Error:** `Error: Invalid Figma variable export format`

**Cause:** The JSON file isn't a valid Figma variable export.

**Solution:**

1. Export correctly from Figma:
   - **File → Export → Variables → JSON**
   - Select the collection to export
   - Export each mode as a separate file

2. Verify the file contains `$extensions.com.figma`:
   ```json
   {
     "$extensions": {
       "com.figma": {
         "variableId": "VariableID:1:123"
       }
     }
   }
   ```

### "Mode not detected"

**Symptom:** Import doesn't recognize different modes.

**Cause:** Mode name not in filename or metadata.

**Solutions:**

1. **Name files with mode suffix:**
   ```
   theme.light.json
   theme.dark.json
   ```

2. **Or ensure metadata exists:**
   ```json
   {
     "$extensions": {
       "com.figma": {
         "modeName": "light"
       }
     }
   }
   ```

---

## Debug Mode

For detailed logging, enable debug mode:

```bash
DEBUG=synkio npx synkio pull
```

Or for even more detail:

```bash
DEBUG=synkio:* npx synkio pull
```

This shows:
- API requests and responses
- Token processing steps
- File write operations
- Timing information

---

## Getting Help

If you're still stuck:

1. **Check the docs:** [Configuration Guide](/guide/configuration)
2. **Search issues:** [GitHub Issues](https://github.com/rgehrkedk/synkio/issues)
3. **Open an issue:** Include:
   - Error message
   - `synkio.config.json` (redact token)
   - Output of `synkio validate`
   - Node.js version (`node --version`)
