# Synkio Setup Guide

## ✅ Repository Created!

The Synkio monorepo has been initialized at `/Users/rasmus/synkio/`

Initial commit: `d5fb8aa`

---

## 📤 Next Steps: Push to GitHub

### 1. Create GitHub Repository

Go to [github.com/new](https://github.com/new) and create a new repository:

- **Name:** `synkio`
- **Description:** Designer-first design token synchronization from Figma to code
- **Visibility:** Public (or Private if you prefer)
- **⚠️ DO NOT initialize with README, .gitignore, or license** (we already have these)

### 2. Push to GitHub

```bash
cd /Users/rasmus/synkio

# Add remote (replace 'yourname' with your GitHub username)
git remote add origin https://github.com/yourname/synkio.git

# Push to main branch
git push -u origin main
```

### 3. Verify on GitHub

Visit `https://github.com/yourname/synkio` to see your repo!

---

## 🚀 Next Phase: Copy Files from Clarity

After pushing to GitHub, we'll copy the actual code:

### Phase 1: Copy Core Package
```bash
# From Clarity
cp -r /Users/rasmus/clarity-ds/figma-sync/lib/* /Users/rasmus/synkio/packages/core/src/

# Update imports and paths
# Test locally
```

### Phase 2: Copy Plugins
```bash
# Token Vault (export)
cp -r /Users/rasmus/clarity-ds/token-vault/* /Users/rasmus/synkio/packages/plugin-export/

# Token Importer
cp -r /Users/rasmus/clarity-ds/TokensBridge/plugin/* /Users/rasmus/synkio/packages/plugin-import/
```

### Phase 3: Copy Dashboard
```bash
# Wizard UI
cp -r /Users/rasmus/clarity-ds/app/admin/token-sync/* /Users/rasmus/synkio/apps/dashboard/app/(dashboard)/wizard/

# API routes
cp -r /Users/rasmus/clarity-ds/app/api/token-sync/* /Users/rasmus/synkio/apps/dashboard/app/api/
```

---

## 📊 Current Structure

```
synkio/
├── .github/workflows/      ✅ CI/CD configured
├── packages/
│   ├── core/              🔜 Will contain figma-sync code
│   ├── plugin-export/     🔜 Will contain token-vault code
│   └── plugin-import/     🔜 Will contain TokensBridge code
├── apps/
│   └── dashboard/         🔜 Will contain token-sync UI
├── package.json           ✅ Workspace configured
├── pnpm-workspace.yaml    ✅ Monorepo configured
├── turbo.json             ✅ Build pipeline configured
├── README.md              ✅ Documentation
└── LICENSE                ✅ MIT License
```

---

## 🛠️ Development Commands (After Copying Files)

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in dev mode
pnpm dev

# Run tests
pnpm test
```

---

## 📝 Important Updates Needed

After pushing to GitHub, update these files with your actual info:

1. **package.json** - Replace `yourname` with your GitHub username
2. **README.md** - Update links
3. **packages/core/package.json** - Update repository URL
4. **.github/workflows/*.yml** - Add NPM_TOKEN secret to GitHub

---

## 🎯 Ready?

Push to GitHub now, then let me know and I'll help you copy the files from Clarity!
