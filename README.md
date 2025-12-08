# Synkio

**Designer-first design token synchronization from Figma to code.**

Synkio enables designers and developers to sync Figma Variables to their codebase with zero friction. One click in Figma, instant updates in code.

---

## 🚀 Quick Start

### For Developers

```bash
# Install CLI
npm install -g @synkio/core

# Initialize in your project
npx synkio init

# Sync tokens from Figma
npx synkio sync
```

### For Designers

1. Install [Synkio Export Plugin](https://figma.com/community/plugin/synkio-export) in Figma
2. Open your design file
3. Click "Sync to Node" → Copy the node ID
4. Share with your dev team

### For Everyone

Visit [synkio.io](https://synkio.io) to preview your tokens visually without installing anything.

---

## 📦 Packages

This is a monorepo containing:

- **[@synkio/core](packages/core/)** - NPM package for CLI and programmatic API
- **[plugin-export](packages/plugin-export/)** - Figma plugin for exporting variables
- **[plugin-import](packages/plugin-import/)** - Figma plugin for importing JSON tokens
- **[dashboard](apps/dashboard/)** - Web dashboard at synkio.io

---

## ✨ Features

- 🎨 **Visual Preview** - See your tokens rendered as colors, typography, spacing
- 🔄 **Bidirectional Sync** - Import JSON to Figma, export Variables to code
- 🎯 **Framework Agnostic** - Works with Next.js, Remix, Vite, plain HTML
- 🎨 **Style Dictionary** - Automatic token compilation to CSS, SCSS, Tailwind
- 🔍 **Smart Diff** - See what changed before syncing
- 🔄 **Code Migration** - Auto-update token references in your codebase
- 💾 **Backup & Rollback** - Never lose your tokens

---

## 🏗️ Architecture

```
Figma Variables
       ↓
  Synkio Plugin (export to Node data)
       ↓
  Figma REST API
       ↓
  @synkio/core (CLI/API)
       ↓
  Your codebase (JSON tokens)
       ↓
  Style Dictionary (optional)
       ↓
  CSS/SCSS/Tailwind/etc.
```

---

## 📖 Documentation

- [Getting Started](docs/getting-started.md)
- [CLI Reference](docs/cli-reference.md)
- [API Reference](docs/api-reference.md)
- [Plugin Guide](docs/plugin-guide.md)
- [Examples](examples/)

---

## 🔧 Troubleshooting

### Figma API Issues

**Rate Limiting (429 errors)**

Synkio automatically handles Figma API rate limits with exponential backoff retry (1s, 2s, 4s). If you see repeated rate limit errors:

```bash
# Retry automatically happens in the background
# Check the request ID in error messages for debugging
```

**Server Errors (5xx)**

Temporary Figma server issues are automatically retried up to 3 times. If sync continues to fail:

1. Check [Figma Status](https://status.figma.com) for outages
2. Verify your access token is valid
3. Try again in a few minutes

**Authentication Errors (403)**

```
Error: Figma API error (403): Forbidden
```

This means your `FIGMA_ACCESS_TOKEN` is invalid or expired:

1. Generate a new token at [Figma Settings → Personal Access Tokens](https://figma.com/settings)
2. Update your `.env` file: `FIGMA_ACCESS_TOKEN=figd_...`
3. Run `synkio sync` again

### Configuration Errors

**Missing Configuration**

```
Error: Configuration not found.
Run 'synkio init' to create a configuration file.
```

Solution: Run `synkio init` to create `tokensrc.json` in your project root.

**Invalid Configuration**

```
Error: figma.fileId is required
```

Zod validation ensures your config is correct. The error message will tell you exactly what's missing or invalid. Common fixes:

- Add missing required fields to `tokensrc.json`
- Fix typos in field names (strict validation catches this)
- Ensure `version` follows semver format: `"1.0.0"`

### Debug Mode

Enable verbose logging to see detailed information about API calls and retry attempts:

```bash
DEBUG=1 synkio sync
```

This shows:
- Figma API request/response details
- Retry attempts and backoff timing
- Token processing steps
- File operations

### Network Issues

**Timeout Errors**

```
Error: Request timeout after 30000ms
```

This means the Figma API didn't respond within 30 seconds. Usually caused by:

- Slow network connection
- Very large Figma files
- Figma API slowdown

Solution:
1. Check your internet connection
2. Try again (timeouts are rare and usually transient)
3. If persistent, the file might be too large - contact support

### Getting Help

If you encounter issues not covered here:

1. Check the [documentation](https://synkio.io/docs)
2. Search [GitHub Issues](https://github.com/rgehrkedk/synkio/issues)
3. Open a new issue with:
   - Error message and stack trace
   - Output from `DEBUG=1 synkio sync`
   - Your `tokensrc.json` (redact sensitive info)
   - Request ID from error message (if applicable)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- [Website](https://synkio.io)
- [Documentation](https://synkio.io/docs)
- [NPM Package](https://npmjs.com/package/@synkio/core)
- [GitHub](https://github.com/rgehrkedk/synkio)
- [Figma Community](https://figma.com/community/plugin/synkio)

---

**Made with ❤️ for designers and developers**
