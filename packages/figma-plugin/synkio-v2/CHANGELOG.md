# Changelog

All notable changes to the Synkio Figma Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive error handling for GitHub API calls
- JSON validation for baseline data with user-friendly error messages
- Null checks and error boundaries for Figma variable operations
- Security documentation for token management
- Installation guide for development setup
- Troubleshooting guide for common issues
- Accessibility labels for interactive elements
- Debug mode toggle (Ctrl+Shift+D)

### Changed
- Improved error messages with actionable guidance
- Enhanced clipboard feedback on copy failure

### Fixed
- XSS vulnerability in activity feed (replaced innerHTML with safe DOM construction)
- Silent failures when GitHub API requests fail
- Missing response validation in PR creation flow
- Race conditions in setup form state management

### Security
- Added input validation for GitHub owner/repo names
- Added URL validation for remote sources
- Added file path validation to prevent path injection

## [1.0.0] - 2024-XX-XX

### Added
- Initial public release
- Two-way sync between Figma variables and code
- GitHub integration for fetching baselines
- Pull request creation for Figma → Code updates
- URL-based baseline fetching
- Support for variable types:
  - Colors (hex, rgba)
  - Numbers
  - Strings
  - Booleans
  - Dimensions
- Support for style types:
  - Paint styles (solid, gradient)
  - Text styles (typography)
  - Effect styles (shadows, blur)
- ID-based diffing to distinguish renames from deletions
- Collection and mode management
- Sync history tracking
- Onboarding flow for first-time setup
- Dark mode support (follows Figma theme)
