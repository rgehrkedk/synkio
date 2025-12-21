# Publishing Synkio to Figma Community

This guide contains everything you need to publish the Synkio plugin to the Figma Community.

## Pre-Publishing Checklist

- [ ] Build the plugin: `npm run build`
- [ ] Test all features in Figma desktop app
- [ ] Create plugin icon (see Icon Requirements below)
- [ ] Create cover image (see Cover Image Requirements below)
- [ ] Get your Plugin ID from Figma

## Getting Your Plugin ID

1. Open Figma desktop app
2. Go to **Plugins** > **Development** > **New plugin...**
3. Click **Figma design** and choose **With UI & browser APIs**
4. Give it a name (e.g., "Synkio")
5. Figma will create a new plugin with an ID
6. Copy the ID from the generated `manifest.json`
7. Replace `PLUGIN_ID_FROM_FIGMA` in your [manifest.json](manifest.json) with this ID

## Publishing Steps

1. Open Figma desktop app
2. Go to **Plugins** > **Development** > **synkio-ui** (your local plugin)
3. In the plugin panel, click the **⋯** menu
4. Select **Publish new release...**
5. Fill in the listing details (copy from sections below)
6. Upload your assets
7. Submit for review

---

## Figma Community Listing Content

### Plugin Name
```
Synkio
```

### Tagline (max 60 characters)
```
Sync Figma variables to code. No Enterprise required.
```

### Description (for the Community page)

```
Synkio bridges the gap between Figma design variables and your codebase - without requiring an Enterprise plan.

HOW IT WORKS
Synkio uses a "Hybrid Sync" approach. This plugin reads your Figma variables and styles, storing them in the file's sharedPluginData. The companion CLI then fetches this data via the standard REST API and generates output files.

FEATURES

Diff View
See exactly what's changed since your last sync:
• Added - New variables or styles
• Modified - Changed values
• Deleted - Removed items
• Renamed - Path changes detected via permanent IDs

Sync History
Track the last 5 sync events with user info, timestamps, and expandable change details.

Collection Management
Control what gets synced by including/excluding specific variable collections and style types.

Style Support
Full support for paint styles (colors, gradients), text styles (typography), and effect styles (shadows, blurs).

GETTING STARTED

1. Install the CLI: npm install synkio --save-dev
2. Initialize: npx synkio init
3. Open this plugin and click "Prepare for Sync"
4. Run: npx synkio sync

Your design tokens are now in your codebase!

REQUIREMENTS
• Any Figma plan (Free, Professional, Organization, or Enterprise)
• Synkio CLI (npm package)
• Figma personal access token

LINKS
• CLI Package: https://www.npmjs.com/package/synkio
• Documentation: https://github.com/rgehrkedk/synkio
• Report Issues: https://github.com/rgehrkedk/synkio/issues
```

### Categories
Select these categories in the Figma Community form:
- **Design Systems**
- **Development**

### Tags
```
design tokens, variables, sync, code, css, json, style dictionary, design system, developer tools
```

---

## Asset Requirements

### Plugin Icon
- **Size:** 128 x 128 pixels
- **Format:** PNG or SVG
- **Background:** Can be transparent or solid
- **Style:** Simple, recognizable at small sizes
- **Suggestion:** A sync/refresh icon with the Synkio brand colors

### Cover Image
- **Size:** 1920 x 960 pixels (2:1 ratio)
- **Format:** PNG or JPG
- **Content suggestions:**
  - Show the plugin UI with the diff view
  - Include the tagline "Sync Figma variables to code"
  - Highlight "No Enterprise required"
  - Clean, professional design system aesthetic

### Screenshots (optional but recommended)
- **Size:** 1920 x 1080 pixels (16:9 ratio)
- **Quantity:** 3-5 screenshots
- **Suggested screenshots:**
  1. Diff tab showing added/modified/deleted changes
  2. History tab with sync events
  3. Collections tab with exclusion options
  4. Full workflow showing Figma + terminal

---

## Support Links

When filling out the publishing form, use these URLs:

| Field | URL |
|-------|-----|
| Documentation | https://github.com/rgehrkedk/synkio |
| Support | https://github.com/rgehrkedk/synkio/issues |
| Terms of Service | (optional - leave blank or add if you have one) |
| Privacy Policy | (optional - leave blank or add if you have one) |

---

## Post-Publishing

After your plugin is approved:

1. Update the main [README.md](../../../README.md) to link to the published plugin
2. Announce on social media / design communities
3. Add the Figma Community badge to your npm package README

### Community Badge (after publishing)

Add this to your READMEs:
```markdown
[![Figma Community](https://img.shields.io/badge/Figma-Community-blueviolet?logo=figma)](https://www.figma.com/community/plugin/YOUR_PLUGIN_ID)
```

---

## Review Timeline

Figma typically reviews plugins within 1-3 business days. You'll receive an email when:
- Your plugin is approved and live
- Changes are requested (with specific feedback)

## Updating the Plugin

For future updates:
1. Make your code changes
2. Run `npm run build`
3. Update the version in [package.json](package.json)
4. Update [CHANGELOG.md](CHANGELOG.md)
5. In Figma: **Plugins** > **Development** > **synkio-ui** > **⋯** > **Publish new release**
6. Add release notes describing the changes
