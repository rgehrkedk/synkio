# Figma Plugin Publish Checklist

Pre-publication checklist for Synkio Figma plugin.

## Critical Blockers

These must be completed before submitting to Figma Community.

### 1. Plugin ID

- [ ] Register plugin at [figma.com/developers/plugins](https://www.figma.com/developers/plugins)
- [ ] Copy the Plugin ID from the developer console
- [ ] Update `manifest.json` line 3:
  ```json
  "id": "YOUR_ACTUAL_PLUGIN_ID"
  ```

### 2. Manifest Description

- [ ] Add description field to `manifest.json`:
  ```json
  "description": "Sync Figma variables to code as W3C DTCG tokens. Create PRs, track changes, and maintain design-code consistency without Enterprise plan."
  ```

### 3. Network Access Cleanup

- [ ] Simplify localhost domains in `manifest.json`:
  ```json
  "networkAccess": {
    "allowedDomains": [
      "https://api.github.com",
      "https://raw.githubusercontent.com",
      "http://localhost"
    ],
    "reasoning": "GitHub API for PR workflow and fetching baselines. Localhost for synkio CLI serve command during local development."
  }
  ```

### 4. Build Artifacts

- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Verify `dist/code.js` exists
- [ ] Verify `dist/ui.html` exists

### 5. Plugin Icon

- [ ] Create plugin icon (128x128px PNG recommended)
- [ ] Save as `icon.png` in plugin root
- [ ] Add to manifest if required by Figma

---

## Community Listing Assets

Required for Figma Community page.

### Cover Image
- [ ] Create cover image (1920x960px recommended)
- [ ] Show plugin UI or key workflow

### Screenshots
- [ ] Screenshot 1: Setup tab with GitHub connection
- [ ] Screenshot 2: Sync tab showing diff view
- [ ] Screenshot 3: PR creation flow
- [ ] Screenshot 4: History tab

### Description Content
- [ ] Write short description (displayed in search results)
- [ ] Write full description with:
  - Key features
  - How it works
  - Requirements (CLI, GitHub token)
  - Link to CLI npm package

---

## Testing Checklist

### Functional Testing
- [ ] Fresh install flow (no existing config)
- [ ] GitHub token setup and validation
- [ ] Fetch baseline from GitHub repo
- [ ] Fetch baseline from local server (`synkio serve`)
- [ ] Variable sync with diff detection
- [ ] PR creation workflow
- [ ] History tab displays correctly

### Edge Cases
- [ ] Invalid GitHub token handling
- [ ] Network failure handling
- [ ] Empty/missing baseline handling
- [ ] Large variable sets (100+ variables)

### Platform Testing
- [ ] Figma Desktop (macOS)
- [ ] Figma Desktop (Windows)
- [ ] Figma Web (Chrome)

### Theme Testing
- [ ] Light theme UI
- [ ] Dark theme UI

---

## Pre-Submit Verification

### Code Quality
- [x] No hardcoded credentials
- [x] XSS protections in place
- [x] Input validation on user inputs
- [x] Error messages are user-friendly
- [ ] No console.log statements in production build
- [ ] No TODO comments remaining

### Documentation
- [x] README.md complete
- [x] INSTALLATION.md complete
- [x] TROUBLESHOOTING.md complete
- [x] SECURITY.md complete
- [x] CHANGELOG.md up to date

### Version
- [ ] Verify version in `package.json` matches release
- [ ] Update CHANGELOG.md with release date

---

## Submission Steps

1. [ ] Complete all blockers above
2. [ ] Build final production version: `npm run build`
3. [ ] Open Figma Developer Console
4. [ ] Upload plugin files (manifest.json + dist/)
5. [ ] Add Community listing assets
6. [ ] Write release notes
7. [ ] Submit for review

---

## Post-Publish

- [ ] Test installation from Community
- [ ] Verify all features work in published version
- [ ] Monitor for user feedback/issues
- [ ] Update CLI documentation to reference published plugin
