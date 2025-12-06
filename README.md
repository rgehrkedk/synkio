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
