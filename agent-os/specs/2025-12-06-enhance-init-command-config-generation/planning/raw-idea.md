# Raw Feature Idea

**Feature Description:**
Enhance packages/core/src/cli/commands/init.ts to generate complete tokensrc.json configuration by porting logic from setup.ts.

**Key Requirements:**
1. Collection Configuration: After fetching Figma data, analyze collections and prompt user for split strategy (byMode, byGroup, or flat), output directory path, and file paths for each mode/group
2. Style Dictionary Detection: Auto-detect Style Dictionary and populate build.styleDictionary section
3. Schema Reference: Add "$schema": "./schemas/tokensrc.schema.json" to generated config
4. Code Cleanup: Remove all [DEBUG] console.log statements and unused imports

**Context:**
This is part of the Synkio project, a tool for syncing Figma design tokens. The init command currently creates a simplified tokensrc.json, but needs to be enhanced to generate complete configuration like the setup command does.

**Reference Files:**
- Source: packages/core/src/cli/commands/setup.ts (lines 68-400+)
- Target: packages/core/src/cli/commands/init.ts
- Helpers: packages/core/src/tokens/split.ts, packages/core/src/detect/index.ts, packages/core/src/style-dictionary/index.ts
