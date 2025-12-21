# Changelog

All notable changes to the Synkio Figma plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-12-20

### Added
- **Style support** - Full support for Figma styles (paint, text, effect)
  - Paint styles with solid colors and gradients
  - Text styles with DTCG typography composite format
  - Effect styles for shadows and blurs
  - Variable reference resolution in styles
- **Style type filtering** - Exclude specific style types from sync
- **Collections tab** - Unified view for managing collections and style types

### Changed
- Improved diff comparison with style entries
- Enhanced UI with style type badges and counts
- Updated data format to include styles alongside variables

## [1.3.0] - 2025-12-15

### Added
- **Collection exclusion** - Ability to exclude specific variable collections from sync
- **Validation** - Ensures at least one collection remains included
- **Persistent settings** - Exclusion preferences saved in sharedPluginData

## [1.2.0] - 2025-12-10

### Added
- **Sync history** - View last 5 sync events with user info and timestamps
- **Expandable history details** - Click to see specific changes per sync
- **User avatars** - Display syncing user's photo ID

### Changed
- Optimized data chunking for Figma's 100KB storage limit
- Improved comparison algorithm performance

## [1.1.0] - 2025-12-05

### Added
- **Rename detection** - Distinguish renames from deletions using permanent variable IDs
- **Mode tracking** - Detect added/removed variable modes
- **Value comparison** - Show before/after values for modified variables

### Fixed
- Improved handling of variable aliases
- Better color value formatting

## [1.0.0] - 2025-12-01

### Added
- Initial release
- **Diff view** - Visual comparison of pending changes
- **Prepare for Sync** - Snapshot current state for CLI consumption
- **Tab interface** - Organized UI with Diff and History tabs
- **Change categorization** - Added, modified, deleted badges
- **sharedPluginData storage** - Data accessible via standard Figma API
