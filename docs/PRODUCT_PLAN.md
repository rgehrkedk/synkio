# Synkio Tokens - Product Plan

## Vision
A micro-SaaS tool that enables designers and developers to sync Figma design tokens to code with zero configuration.

**Target Users:**
- Design system teams
- Product designers who want to see tokens rendered
- Frontend developers managing design tokens
- Agencies building multiple design systems

---

## Current State Analysis

### What We Have (figma-sync/)
**Core Engine: ~6,816 lines across 34 files**

```
figma-sync/
├── bin/                    # CLI commands (4 files)
│   ├── setup.ts           # Interactive setup wizard
│   ├── sync.ts            # Fetch & apply tokens
│   ├── diff.ts            # Compare Figma vs local
│   └── rollback.ts        # Restore previous baseline
│
├── lib/
│   ├── figma/             # Figma REST API integration
│   │   ├── api.ts         # Fetch plugin data
│   │   ├── parser.ts      # Extract chunked data
│   │   └── constants.ts
│   │
│   ├── tokens/            # Token processing
│   │   ├── split.ts       # Split collections into files
│   │   ├── transform.ts   # Apply adapters/transforms
│   │   ├── migrate.ts     # Scan & apply code migrations
│   │   ├── apply-migrations.ts
│   │   ├── parser.ts
│   │   └── report-generator.ts
│   │
│   ├── compare/           # Diff engine
│   │   ├── diff.ts        # Compare baselines
│   │   └── index.ts
│   │
│   ├── files/             # File system operations
│   │   ├── loader.ts      # Load config & baseline
│   │   ├── paths.ts       # Path resolution
│   │   └── index.ts
│   │
│   ├── detect/            # Auto-detect project structure
│   │   ├── index.ts       # Detect framework & tokens
│   │   └── scaffold.ts    # Generate config
│   │
│   ├── adapters/          # Transform adapters (Tailwind, CSS vars, etc.)
│   │   ├── defaults.ts
│   │   └── index.ts
│   │
│   ├── style-dictionary/  # Style Dictionary integration
│   │   └── index.ts
│   │
│   ├── types/             # TypeScript definitions
│   │   ├── config.ts
│   │   ├── baseline.ts
│   │   ├── figma.ts
│   │   ├── migration.ts
│   │   └── index.ts
│   │
│   └── cli/               # CLI utilities
│       ├── prompt.ts
│       └── index.ts
```

### Admin UI (app/admin/token-sync/)
**Next.js wizard with 5 steps:**
1. Connect - Enter Figma URL & token
2. Map - Configure collection → file mappings
3. Preview - See diffs before syncing
4. Migrate - Apply code migrations (rename tokens in codebase)
5. Sync - Execute full sync with backup/rollback

**API Routes (app/api/token-sync/):**
- `/connect` - Validate Figma connection
- `/config` - Load/save tokensrc.json
- `/preview` - Generate diff report
- `/scan` - Scan codebase for token usage
- `/sync` - Execute sync workflow
- `/rollback` - Restore previous baseline
- `/auth` - Session management

**Key Dependencies:**
- Figma REST API
- Style Dictionary (token compilation)
- File system access (Node.js)
- Git operations (backup/restore)

---

## Phase 1: Extract Standalone Package (2-4 weeks)

### Goal
Make `figma-sync/` a publishable, framework-agnostic NPM package that works in any project.

### 1.1 Package Structure

```
@synkio/sync/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── .npmignore
│
├── src/
│   ├── core/              # Core sync engine (from lib/)
│   │   ├── figma/
│   │   ├── tokens/
│   │   ├── compare/
│   │   ├── files/
│   │   ├── detect/
│   │   ├── adapters/
│   │   └── types/
│   │
│   ├── cli/               # CLI commands (from bin/)
│   │   ├── commands/
│   │   │   ├── init.ts    # npx @synkio/sync init
│   │   │   ├── sync.ts    # npx @synkio/sync sync
│   │   │   ├── diff.ts    # npx @synkio/sync diff
│   │   │   └── rollback.ts
│   │   └── index.ts
│   │
│   ├── api/               # Programmatic API
│   │   └── index.ts       # Export functions for Next.js/Remix/etc.
│   │
│   └── index.ts           # Main entry point
│
├── dist/                  # Compiled output
│   ├── cli.js            # CLI entry point
│   ├── index.js          # Library entry point
│   └── api.js            # API entry point
│
└── templates/             # Config templates
    ├── tokensrc.minimal.json
    ├── tokensrc.nextjs.json
    ├── tokensrc.tailwind.json
    └── tokensrc.styled-components.json
```

### 1.2 Package Exports

**package.json:**
```json
{
  "name": "@synkio/sync",
  "version": "0.1.0",
  "description": "Sync Figma design tokens to code",
  "author": "Your Name",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "clarity-sync": "./dist/cli.js"
  },
  "exports": {
    ".": "./dist/index.js",
    "./api": "./dist/api.js",
    "./core/*": "./dist/core/*.js"
  },
  "files": [
    "dist",
    "templates"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "style-dictionary": "^4.0.0",
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "keywords": [
    "figma",
    "design-tokens",
    "sync",
    "design-system",
    "css-variables",
    "tailwind"
  ]
}
```

### 1.3 API Design (Programmatic)

**For Next.js App Router (like your current setup):**
```typescript
// app/api/token-sync/route.ts
import { fetchFigmaData, compareBaselines, applySyncChanges } from '@synkio/sync/api';

export async function POST(request: Request) {
  const { fileUrl, accessToken } = await request.json();

  const data = await fetchFigmaData({ fileUrl, accessToken });
  const diff = await compareBaselines(data, './tokens');
  const result = await applySyncChanges(diff);

  return Response.json(result);
}
```

**For CLI usage:**
```bash
npx @synkio/sync init          # Interactive setup
npx @synkio/sync sync          # Sync from Figma
npx @synkio/sync diff          # Show changes
npx @synkio/sync rollback      # Undo last sync
```

### 1.4 Configuration (tokensrc.json)

**Make it framework-agnostic:**
```json
{
  "version": "2.0.0",

  "figma": {
    "fileId": "ABC123",
    "nodeId": "1:2",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },

  "paths": {
    "data": "./.figma/data",
    "baseline": "./.figma/data/baseline.json",
    "tokens": "./tokens",
    "styles": "./styles/tokens"
  },

  "collections": {
    "primitives": {
      "strategy": "byGroup",
      "output": "./tokens/primitives",
      "files": {
        "colors": "./tokens/primitives/colors.json",
        "typography": "./tokens/primitives/typography.json"
      }
    },
    "brands": {
      "strategy": "byMode",
      "output": "./tokens/brands",
      "files": {
        "acme": "./tokens/brands/acme.json",
        "globex": "./tokens/brands/globex.json"
      }
    }
  },

  "build": {
    "styleDictionary": {
      "platforms": {
        "css": {
          "transformGroup": "css",
          "buildPath": "./styles/tokens/",
          "files": [
            {
              "destination": "variables.css",
              "format": "css/variables"
            }
          ]
        }
      }
    }
  },

  "migration": {
    "enabled": true,
    "platforms": ["css", "scss", "js", "ts", "jsx", "tsx"],
    "exclude": ["node_modules/**", "dist/**", ".next/**"]
  }
}
```

### 1.5 Implementation Checklist

**Week 1: Extract & Reorganize**
- [ ] Create new repo: `@synkio/sync`
- [ ] Copy `figma-sync/lib` → `src/core`
- [ ] Copy `figma-sync/bin` → `src/cli`
- [ ] Create `src/api` for programmatic usage
- [ ] Update all imports (remove Synkio-specific paths)
- [ ] Add TypeScript build config

**Week 2: Make Framework-Agnostic**
- [ ] Remove hard-coded paths (use config only)
- [ ] Make Style Dictionary optional (allow custom build scripts)
- [ ] Support multiple token formats (JSON, YAML, JS)
- [ ] Add adapter system (Tailwind, CSS vars, Styled Components)
- [ ] Test with Next.js, Remix, Vite, plain HTML

**Week 3: CLI & Documentation**
- [ ] Build CLI with `commander`
- [ ] Add interactive `init` command with templates
- [ ] Add progress spinners, colored output
- [ ] Write comprehensive README
- [ ] Create migration guide from old setup

**Week 4: Testing & Publishing**
- [ ] Unit tests for core functions
- [ ] Integration tests (real Figma file)
- [ ] Test in 3+ project types
- [ ] Publish to NPM (beta)
- [ ] Update Synkio repo to use package

---

## Phase 2: Hosted Dashboard (4-6 weeks)

### Goal
Build a read-only preview dashboard where anyone can paste a Figma URL and see their tokens rendered.

### 2.1 Architecture

```
tokens.clarity.app/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx
│   │   ├── docs/page.tsx
│   │   └── examples/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── preview/
│   │   │   └── page.tsx          # Main preview tool
│   │   │
│   │   └── api/
│   │       ├── preview/route.ts  # POST: Fetch Figma data
│   │       └── export/route.ts   # GET: Download tokens
│   │
│   └── layout.tsx
│
├── components/
│   ├── TokenPreview.tsx          # Visual token renderer
│   ├── ColorPalette.tsx
│   ├── TypographyScale.tsx
│   ├── SpacingGrid.tsx
│   ├── ExportButton.tsx
│   └── CodeSnippet.tsx
│
└── lib/
    └── @synkio/sync      # Import our package!
```

### 2.2 User Flow (No Auth)

```
1. Landing page
   ↓
2. "Try Preview" → Enter Figma URL + Access Token
   ↓
3. Dashboard fetches & parses tokens
   ↓
4. Show visual preview:
   - Color palettes with names/values
   - Typography scale (live rendered)
   - Spacing/radius/shadow samples
   - Raw JSON viewer
   ↓
5. Export options:
   - Download JSON
   - Download CSS
   - Download Tailwind config
   - Copy NPM install command
```

### 2.3 Preview Dashboard Features

**Left Sidebar: Collection Tree**
```
📁 primitives
  🎨 colors (142)
  📝 typography (24)
  📐 spacing (12)

📁 brands
  🏷️  clarity (215)
  🏷️  velocity (215)
  🏷️  zenith (215)

📁 themes
  🌙 dark (15)
  ☀️  light (15)
```

**Main Panel: Visual Preview**
```typescript
// ColorPalette.tsx
<div className="grid grid-cols-5 gap-4">
  {colors.map(token => (
    <div key={token.path}>
      <div
        className="h-20 rounded-lg border"
        style={{ backgroundColor: token.value }}
      />
      <p className="text-sm font-mono">{token.path}</p>
      <p className="text-xs text-gray-500">{token.value}</p>
    </div>
  ))}
</div>
```

**Right Panel: Code Export**
```typescript
// Export formats
- CSS Variables
- SCSS Variables
- Tailwind Config
- Style Dictionary Config
- JSON (raw)
- TypeScript Types
```

### 2.4 Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React Server Components
- Tailwind CSS
- Radix UI (same as Synkio)
- `@synkio/sync` package

**Backend:**
- Next.js API Routes (serverless)
- No database needed for Phase 2
- Edge runtime for speed

**Deployment:**
- Vercel (automatic via GitHub)
- Environment variables for secrets

### 2.5 Implementation Checklist

**Week 1: Landing Page**
- [ ] Design & build landing page
- [ ] Value proposition, features, examples
- [ ] "Try Preview" CTA
- [ ] Documentation pages

**Week 2: Preview Core**
- [ ] Build preview form (Figma URL input)
- [ ] API route: fetch Figma data via `@synkio/sync`
- [ ] Parse collections, modes, groups
- [ ] Display raw JSON

**Week 3: Visual Renderers**
- [ ] ColorPalette component (swatches + values)
- [ ] TypographyScale component (live text rendering)
- [ ] SpacingGrid component (visual spacing scale)
- [ ] RadiusPreview, ShadowPreview components

**Week 4: Export Features**
- [ ] Export to CSS variables
- [ ] Export to Tailwind config
- [ ] Export to JSON
- [ ] Copy to clipboard
- [ ] Download as file

**Week 5: Polish & UX**
- [ ] Loading states, error handling
- [ ] Mobile responsive
- [ ] Share preview link (URL params?)
- [ ] Example tokens (demo mode)

**Week 6: Launch**
- [ ] Deploy to Vercel
- [ ] Set up analytics
- [ ] Launch on Product Hunt
- [ ] Share on Twitter/LinkedIn

---

## Phase 2.5: Dashboard Enhancements (Optional)

### 2.6 Advanced Features (If Time Permits)

**Shareable Previews:**
- Generate short link: `tokens.clarity.app/p/abc123`
- Store Figma data in Redis (1 hour TTL)
- No auth needed to view shared preview

**Compare Mode:**
- Upload two Figma files
- Show side-by-side diff
- Highlight changes

**Figma Plugin Companion:**
- One-click "Preview in Synkio Tokens"
- Auto-fills URL + generates temp token
- Deep link to specific collection

**AI Features:**
- "Analyze my token structure" → suggestions
- "Are my colors accessible?" → WCAG audit
- "Generate Tailwind config from this palette"

---

## Success Metrics

### Phase 1 (Package)
- ✅ 10+ GitHub stars
- ✅ 50+ NPM downloads/week
- ✅ Works in Next.js, Remix, Vite
- ✅ 3+ community PRs or issues

### Phase 2 (Dashboard)
- ✅ 100+ unique visitors/week
- ✅ 20+ previews generated
- ✅ 10+ exports downloaded
- ✅ 1+ featured in design tool roundups

---

## Monetization Strategy (Phase 3)

### Free Tier
- Preview any public Figma file
- Export to JSON/CSS
- Community support

### Pro Tier ($9/mo)
- Save connections (no re-entering URLs)
- Private Figma files
- Webhooks (auto-sync on Figma changes)
- GitHub integration (auto-PR)
- Priority support

### Team Tier ($29/mo)
- Shared workspaces
- Role-based access
- Audit logs
- SSO

### Enterprise (Custom)
- On-premise deployment
- Custom adapters
- SLA
- Dedicated support

---

## Next Steps

### Immediate (This Week)
1. **Create package repo:** `@synkio/sync`
2. **Extract figma-sync:** Copy lib/ and bin/ to new repo
3. **Update imports:** Remove Synkio-specific paths
4. **Test locally:** Ensure CLI works standalone
5. **Publish beta:** NPM with `@beta` tag

### Short-term (Next 2 Weeks)
1. **Refactor Synkio:** Use `@synkio/sync` package
2. **Write docs:** README, migration guide
3. **Create templates:** Next.js, Tailwind, CSS examples
4. **Build landing page:** tokens.clarity.app marketing site

### Medium-term (1-2 Months)
1. **Launch dashboard:** Preview tool live
2. **Get feedback:** Share with design community
3. **Iterate:** Based on user feedback
4. **Plan Phase 3:** Auth, webhooks, GitHub integration

---

## Questions to Answer

1. **Pricing:** Free forever? Freemium? Open-source core + hosted premium?
2. **Branding:** "Synkio Tokens" or rebrand as standalone product?
3. **Open-source:** MIT license? Dual-license (OSS core + commercial dashboard)?
4. **Support:** Discord? GitHub Discussions? Email only?
5. **Competitors:** How to differentiate from Specify, Supernova, Tokens Studio?

---

## Risk Mitigation

### Technical Risks
- **Figma API changes:** Version API calls, graceful degradation
- **Token format evolution:** Support multiple versions
- **Browser limits:** Server-side processing, not client-side

### Business Risks
- **Low adoption:** Focus on free tier, build community first
- **Figma builds this:** Differentiate with code-first approach
- **Support burden:** Automate onboarding, great docs

### Legal Risks
- **Token storage:** Never store user tokens (use temp sessions)
- **Figma ToS:** Review API usage limits
- **Privacy:** GDPR compliance (no PII without consent)

---

## Timeline Overview

| Phase | Duration | Outcome |
|-------|----------|---------|
| **Phase 1** | 2-4 weeks | Published NPM package |
| **Phase 2** | 4-6 weeks | Live preview dashboard |
| **Phase 3** | 8-12 weeks | Full SaaS with auth |

**Total to MVP:** 6-10 weeks part-time, 3-5 weeks full-time

---

## Inspiration & Competitors

**Similar Tools:**
- **Specify:** Token management platform (complex, expensive)
- **Supernova:** Design-to-code (enterprise-focused)
- **Tokens Studio:** Figma plugin (no hosted dashboard)
- **Style Dictionary:** CLI only (no Figma integration)

**Your Edge:**
- **Simple:** One click from Figma to code
- **Visual:** See tokens rendered immediately
- **Flexible:** Works with any framework
- **Developer-friendly:** CLI + API + UI

---

**Let's build this! 🚀**
