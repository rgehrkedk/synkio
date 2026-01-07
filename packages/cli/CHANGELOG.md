# Changelog

All notable changes to Synkio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2025-01-07

### Breaking Changes

- **CLI command restructure**: The `sync` command has been split into separate `pull` and `build` commands for better workflow control
  - `synkio pull` - Fetches from Figma and updates baseline.json only
  - `synkio build` - Generates token files from baseline (offline, no Figma API needed)
  - The original `sync` command is deprecated but still works as an alias
- **Directory rename**: Default output directory changed from `.synkio/` to `synkio/` for better git visibility and tracking

### Added

- **`pull` command** - Fetch tokens from Figma and update baseline without generating files
- **`build` command** - Generate token files from baseline (works offline)
- **`diff` command** - Compare baseline with token files on disk (useful for CI validation)
- **`init-baseline` command** - Bootstrap baseline.json from existing token files without requiring Figma IDs
- **`serve` command** - Start local HTTP server for Figma plugin development workflows
- **`docs` command** - Generate static HTML documentation site with:
  - Color swatches with contrast info
  - Typography previews
  - CSS custom properties reference
  - Copy-to-clipboard functionality
- **`export-baseline` command** - Enable code-to-Figma roundtrip workflows
- **Figma styles support** - Full support for paint, text, and effect styles
  - Merge styles into variable collections or keep as standalone files
  - Style metadata preserved (descriptions, blend modes, etc.)
- **GitHub PR workflow** - Create pull requests directly from the Figma plugin
- **CSS generation** - Built-in CSS custom properties output via `build.css.enabled`
- **Utility classes** - Optional utility class generation via `build.css.utilities`

### Changed

- Default output directory from `.synkio/` to `synkio/`
- Improved baseline format with enhanced metadata structure
- Better error messages and validation throughout
- Figma plugin v2 with redesigned UX and improved diff visualization

### Fixed

- Import path resolution issues
- Phantom mode filtering in Figma API responses
- Plugin diff display for renamed variables
- Various edge cases in token comparison logic

## [1.4.0] - 2024-12-20

### Added

- Code quality improvements
- Documentation updates
- Initial public release preparation

## [1.0.0] - 2024-12-01

### Added

- Initial release
- `synkio init` - Interactive project setup
- `synkio sync` - Fetch and save tokens from Figma
- `synkio rollback` - Revert to previous token state
- `synkio validate` - Check config and Figma connection
- `synkio tokens` - Debug utility to view baseline
- Breaking change detection and protection
- ID-based diffing to distinguish renames from deletions
- DTCG format output support
- Per-collection splitting strategies (mode/group/none)
- Figma metadata extensions (description, scopes, codeSyntax)
