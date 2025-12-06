# Synkio Tokens - Product Roadmap

**Last Updated:** December 6, 2024
**Status:** Phase 1 - In Progress
**Current Version:** 0.1.0-alpha

---

## 🎯 Vision

**Synkio Tokens** is a designer-first tool that enables teams to sync Figma design tokens to code with zero configuration.

**Target Audience:**
- Design system teams building and maintaining tokens
- Product designers who want to see tokens rendered visually
- Frontend developers managing design token workflows
- Agencies building multiple design systems for clients

**Core Value Propositions:**
1. **For Designers:** One-click sync from Figma, no Git/CLI knowledge required
2. **For Developers:** Automated PR creation, framework-agnostic NPM package
3. **For Teams:** Visual token preview dashboard, migration tracking, audit history

---

## 📦 Product Structure

```
Synkio Tokens (Monorepo)
├── @synkio/core          # NPM Package - Framework-agnostic token sync
│   ├── CLI               # npx synkio init|sync|diff|rollback
│   └── API               # Programmatic API for Next.js/Remix/etc.
│
├── plugin-export         # Figma Plugin - Token Vault (export to node data)
│   └── Export Variables to sharedPluginData
│
└── dashboard             # Web Dashboard - Visual token preview
    └── Preview tokens from any Figma file (read-only, no auth)
```

---

## 🗺️ Phases Overview

| Phase | Timeline | Focus | Status |
|-------|----------|-------|--------|
| **Phase 1** | Weeks 1-4 | Standalone NPM Package | 🔴 In Progress |
| **Phase 2** | Weeks 5-10 | Hosted Preview Dashboard | ⚪ Not Started |
| **Phase 3** | Weeks 11-22 | Full SaaS with Auth & Billing | ⚪ Not Started |
| **Future** | Year 2+ | Enterprise Features & Scale | ⚪ Planned |

---

## Phase 1: Standalone NPM Package (Weeks 1-4)

**Goal:** Extract `packages/core/` into a publishable, framework-agnostic NPM package that works in any Node.js project.

**Current State:**
- ✅ Code copied from Clarity to `packages/core/src/`
- ✅ Monorepo structure with Turborepo + pnpm
- ✅ Basic structure exists (CLI, core logic, types)
- ❌ **BLOCKER:** Hard-coded paths to `figma-sync/.figma/`
- ❌ Package cannot work standalone until abstracted

### Phase 1A: Context System (Week 1)

**Blocking Issue:** All paths hard-coded, preventing standalone usage.

**Deliverables:**
- [x] Create `src/context.ts` - Path resolution system
- [x] Create `src/env.ts` - Lazy environment variable loading
- [ ] Refactor `src/files/paths.ts` - Convert constants → functions
- [ ] Update `src/figma/constants.ts` - Remove side effects at import
- [ ] Update all 33 TypeScript files to use new path functions
- [ ] Unit tests for context and path resolution
- [ ] Build succeeds with `pnpm build`

**Success Criteria:**
- ✅ Zero hard-coded references to `figma-sync/` in codebase
- ✅ Package works when installed in any project
- ✅ All tests passing

**Files Affected:** ~33 files across `src/cli/`, `src/tokens/`, `src/figma/`, etc.

**Spec:** [agent-os/specs/phase-1-context-system/](../agent-os/specs/phase-1-context-system/)

---

### Phase 1B: Enhanced Configuration (Week 2)

**Goal:** Make paths and build process fully configurable.

**Deliverables:**
- [ ] Enhanced `tokensrc.json` schema with `paths` section
- [ ] Config loader with smart defaults
- [ ] Environment variable interpolation (`${FIGMA_ACCESS_TOKEN}`)
- [ ] Relative path resolution from config directory
- [ ] Backward compatibility with existing configs
- [ ] Config validation with helpful error messages

**Config Schema:**
```json
{
  "version": "2.0.0",
  "figma": {
    "fileId": "ABC123",
    "nodeId": "1:2",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },
  "paths": {
    "root": ".",
    "data": "./.figma",
    "baseline": "./.figma/data/baseline.json",
    "tokens": "./tokens",
    "styles": "./styles/tokens"
  },
  "collections": {
    "primitives": {
      "strategy": "byGroup",
      "output": "./tokens/primitives"
    }
  },
  "build": {
    "command": "npm run tokens:build",
    "styleDictionary": {
      "enabled": true,
      "config": "./style-dictionary.config.js"
    }
  }
}
```

**Success Criteria:**
- ✅ Works without config (uses defaults)
- ✅ Works with minimal config
- ✅ Works with full custom config
- ✅ Clear validation errors for invalid configs

---

### Phase 1C: Modern CLI Experience (Week 2-3)

**Goal:** Upgrade from basic readline to modern, delightful CLI.

**Deliverables:**
- [ ] Add dependencies: `commander`, `inquirer`, `chalk`, `ora`, `boxen`
- [ ] Implement `synkio init` - Interactive setup wizard
- [ ] Implement `synkio sync` - Fetch & apply tokens
- [ ] Implement `synkio diff` - Compare Figma vs local
- [ ] Implement `synkio rollback` - Restore previous baseline
- [ ] Add progress spinners and colored output
- [ ] Add error handling with actionable messages
- [ ] Create templates for common frameworks

**CLI Commands:**
```bash
npx synkio init              # Interactive setup
npx synkio init --template nextjs
npx synkio init --template tailwind

npx synkio sync              # Sync from Figma
npx synkio sync --dry-run    # Preview changes

npx synkio diff              # Show changes
npx synkio diff --format table|json|markdown

npx synkio rollback          # Restore previous
npx synkio rollback --force  # Skip confirmation
```

**Config Templates:**
- `templates/tokensrc.nextjs.json` - Next.js + CSS Variables
- `templates/tokensrc.tailwind.json` - Tailwind config
- `templates/tokensrc.css.json` - Plain CSS custom properties

**Success Criteria:**
- ✅ Onboarding completes in < 2 minutes
- ✅ Clear error messages (no stack traces)
- ✅ Colorful, easy-to-read output
- ✅ Works in CI/CD (non-interactive mode)

---

### Phase 1D: Programmatic API (Week 3)

**Goal:** Enable Next.js, Remix, and other frameworks to use package programmatically.

**Deliverables:**
- [ ] Create `src/api/index.ts` - Public API exports
- [ ] Export core functions: `fetchFigmaData`, `compareBaselines`, `splitTokens`
- [ ] Export all TypeScript types
- [ ] `init()` function for context initialization
- [ ] Clear API documentation in README
- [ ] Usage examples for Next.js, Remix, Express

**API Usage:**
```typescript
// Next.js API Route
import { init, fetchFigmaData, compareBaselines } from '@synkio/core/api';

// Initialize once per process
init({ rootDir: process.cwd() });

export async function POST(request: Request) {
  const { fileUrl, accessToken } = await request.json();

  const data = await fetchFigmaData({ fileUrl, accessToken });
  const diff = await compareBaselines(data, './tokens');

  return Response.json({ diff });
}
```

**Package Exports:**
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./api": "./dist/api/index.js",
    "./core/*": "./dist/core/*.js"
  }
}
```

**Success Criteria:**
- ✅ Works in Next.js App Router
- ✅ Works in Remix loaders
- ✅ Works in Express/Fastify
- ✅ Full TypeScript type safety

---

### Phase 1E: Testing & Publishing (Week 4)

**Goal:** Publish stable beta to NPM, validate in real projects.

**Deliverables:**
- [ ] Unit tests with Vitest (>80% coverage)
- [ ] Integration tests with real Figma file
- [ ] Test in 3 different project types:
  - Next.js 15 project
  - Remix project
  - Vite + vanilla TypeScript
- [ ] README with comprehensive documentation
- [ ] Migration guide from Clarity `figma-sync/`
- [ ] Contributing guidelines
- [ ] Publish to NPM as `@synkio/core@0.1.0-beta`
- [ ] Update Synkio dashboard repo to use package
- [ ] Remove old `figma-sync/` directory

**Package Metadata:**
```json
{
  "name": "@synkio/core",
  "version": "0.1.0-beta.1",
  "description": "Sync Figma design tokens to code",
  "keywords": ["figma", "design-tokens", "design-system"]
}
```

**Success Criteria:**
- ✅ Package installs without errors
- ✅ Works in blank project (no existing config)
- ✅ All tests passing
- ✅ Documentation complete
- ✅ 10+ GitHub stars
- ✅ 50+ NPM downloads in first week

---

## Phase 2: Hosted Preview Dashboard (Weeks 5-10)

**Goal:** Build a hosted dashboard where anyone can paste a Figma URL and see tokens rendered visually.

**Tech Stack:**
- Next.js 15 (App Router)
- React 19
- CSS Modules (NOT Tailwind)
- Radix UI for complex components
- Vercel deployment

### Phase 2A: Landing Page & Marketing (Week 5)

**Deliverables:**
- [ ] Landing page design
- [ ] Value proposition messaging
- [ ] Feature showcase
- [ ] "Try Preview" CTA
- [ ] Documentation site structure
- [ ] Example tokens (demo mode)

**Pages:**
- `/` - Landing page
- `/docs` - Documentation
- `/examples` - Example token sets
- `/preview` - Main preview tool

---

### Phase 2B: Preview Core (Week 6-7)

**Deliverables:**
- [ ] Preview form (Figma URL + access token input)
- [ ] API route: Fetch Figma data via `@synkio/core`
- [ ] Parse collections, modes, groups
- [ ] Collection tree sidebar
- [ ] Raw JSON viewer
- [ ] Error handling & loading states

**User Flow:**
1. User pastes Figma URL
2. User enters Figma access token (or uses demo file)
3. Dashboard fetches tokens via `@synkio/core/api`
4. Shows collection tree + raw JSON

---

### Phase 2C: Visual Token Renderers (Week 7-8)

**Deliverables:**
- [ ] `ColorPalette` component - Swatches with hex/rgba values
- [ ] `TypographyScale` component - Live text rendering
- [ ] `SpacingGrid` component - Visual spacing scale
- [ ] `RadiusPreview` component - Border radius samples
- [ ] `ShadowPreview` component - Drop shadow samples
- [ ] `TokenTree` component - Hierarchical token structure

**Example Components:**

```typescript
// ColorPalette.tsx
<div className={styles.colorPalette}>
  {colors.map(token => (
    <div key={token.path} className={styles.colorSwatch}>
      <div
        className={styles.swatchBox}
        style={{ backgroundColor: token.value }}
      />
      <p className={styles.tokenPath}>{token.path}</p>
      <p className={styles.tokenValue}>{token.value}</p>
    </div>
  ))}
</div>
```

**Styling:** CSS Modules with semantic class names, dark mode support.

---

### Phase 2D: Export Features (Week 8-9)

**Deliverables:**
- [ ] Export to CSS variables
- [ ] Export to Tailwind config
- [ ] Export to JSON (W3C DTCG format)
- [ ] Export to TypeScript
- [ ] Copy to clipboard
- [ ] Download as file
- [ ] NPM install instructions

**Export Formats:**
```typescript
// CSS Variables
:root {
  --color-primary-500: #0055AA;
}

// Tailwind Config
module.exports = {
  theme: {
    colors: {
      primary: { 500: '#0055AA' }
    }
  }
}

// TypeScript
export const tokens = {
  color: {
    primary: { 500: '#0055AA' }
  }
} as const;
```

---

### Phase 2E: Polish & Launch (Week 9-10)

**Deliverables:**
- [ ] Mobile responsive design
- [ ] Share preview link (URL params)
- [ ] Loading states & animations
- [ ] Error boundaries
- [ ] Analytics (Vercel Analytics)
- [ ] SEO optimization
- [ ] Open Graph images
- [ ] Deploy to synkio.io
- [ ] Launch on Product Hunt
- [ ] Share on Twitter, LinkedIn, Design communities

**Success Metrics:**
- ✅ 100+ unique visitors in first week
- ✅ 20+ previews generated
- ✅ 10+ exports downloaded
- ✅ Average session time > 2 minutes

---

## Phase 3: Full SaaS with Auth & Billing (Weeks 11-22)

**Goal:** Transform from free preview tool into a full SaaS with workspaces, teams, and monetization.

### Phase 3A: Authentication & Workspaces (Weeks 11-13)

**Deliverables:**
- [ ] User authentication (Clerk or Auth.js)
- [ ] OAuth: Google, GitHub, Figma
- [ ] Workspace creation
- [ ] Team invites
- [ ] Role-based access (Admin, Editor, Viewer)
- [ ] User settings & profile

**Data Models:**
- User (email, name, avatar)
- Workspace (name, plan, members)
- WorkspaceMember (user, workspace, role)

---

### Phase 3B: Saved Connections (Weeks 13-15)

**Deliverables:**
- [ ] Save Figma file connections
- [ ] Configure destinations (GitHub, GitLab)
- [ ] Store access tokens (encrypted)
- [ ] Multiple destinations per workspace
- [ ] Destination testing & validation

**Destinations:**
- GitHub (PR creation)
- GitLab (MR creation)
- Webhook (custom integrations)
- Download (manual export)

---

### Phase 3C: Automated Sync Workflow (Weeks 15-17)

**Deliverables:**
- [ ] Manual sync trigger from dashboard
- [ ] Automated polling (every 5 minutes for Pro+)
- [ ] Change detection & diff
- [ ] PR creation with structured description
- [ ] Sync history & audit log
- [ ] Email notifications
- [ ] Slack integration

**Sync Workflow:**
1. Detect changes in Figma
2. Generate diff report
3. Create GitHub branch
4. Commit token files
5. Create PR with changelog
6. Notify team via email/Slack

---

### Phase 3D: Billing & Plans (Weeks 17-19)

**Deliverables:**
- [ ] Stripe integration
- [ ] Subscription management
- [ ] Plan limits enforcement
- [ ] Usage tracking
- [ ] Invoice generation
- [ ] Upgrade/downgrade flows
- [ ] Cancellation handling

**Pricing Tiers:**

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---------|------|-------------|---------------|
| Figma files | 1 | 5 | Unlimited |
| Destinations | 1 (download only) | 3 | Unlimited |
| Team members | 1 | 1 | 5 |
| Syncs/month | 10 | 100 | 1,000 |
| GitHub/GitLab | ❌ | ✅ | ✅ |
| Automated sync | ❌ | ✅ | ✅ |
| History retention | 7 days | 30 days | 90 days |
| Support | Community | Email | Priority |

---

### Phase 3E: Enterprise Features (Weeks 19-22)

**Deliverables:**
- [ ] SSO/SAML authentication
- [ ] Advanced audit logs (90+ days)
- [ ] Custom output formats
- [ ] Webhooks API
- [ ] Self-hosted option (Docker)
- [ ] SLA (99.9% uptime)
- [ ] Dedicated support

**Enterprise Tier:** Custom pricing (from $299/mo)
- Unlimited everything
- White-label options
- On-premise deployment
- Custom integrations

---

## Future Phases (Year 2+)

### Potential Features

**Developer Experience:**
- [ ] CLI tool improvements (interactive mode)
- [ ] GitHub Action for token validation
- [ ] VS Code extension (token preview)
- [ ] Breaking change detection
- [ ] Automated migration scripts

**Designer Experience:**
- [ ] Figma plugin improvements (in-plugin preview)
- [ ] Figma Comments integration (PR status)
- [ ] Token usage analytics
- [ ] Design token documentation generator

**Integrations:**
- [ ] Bitbucket support
- [ ] Azure DevOps support
- [ ] Penpot integration (open-source Figma alternative)
- [ ] Linear/Jira integration (link PRs to issues)

**Advanced Features:**
- [ ] Multi-file dependency resolution
- [ ] Token usage tracking across codebase
- [ ] AI-powered token recommendations
- [ ] Accessibility audits (WCAG compliance)

---

## Success Metrics

### Phase 1 (NPM Package)
- ✅ 10+ GitHub stars
- ✅ 50+ NPM downloads/week
- ✅ Works in Next.js, Remix, Vite
- ✅ 3+ community PRs or issues

### Phase 2 (Dashboard)
- ✅ 100+ unique visitors/week
- ✅ 20+ previews generated
- ✅ 10+ exports downloaded
- ✅ Featured in 1+ design tool roundups

### Phase 3 (SaaS)
- ✅ $1,000 MRR (Monthly Recurring Revenue)
- ✅ 20+ paying customers
- ✅ 5% free-to-paid conversion
- ✅ <8% monthly churn
- ✅ NPS > 50

### Year 2
- ✅ $10,000 MRR
- ✅ 100+ paying customers
- ✅ 3+ enterprise deals
- ✅ Profitable (MRR > costs)

---

## Risks & Mitigations

### Technical Risks

**R1: Figma API Changes**
- **Risk:** Figma changes REST API, breaking integration
- **Impact:** Critical
- **Mitigation:**
  - Version API calls where possible
  - Monitor Figma changelog
  - Feature flags for quick rollback
  - Comprehensive test suite

**R2: Hard-coded Path Cleanup**
- **Risk:** Miss some hard-coded paths, breaking standalone usage
- **Impact:** High
- **Mitigation:**
  - Extensive search for `'figma-sync'` string
  - TypeScript to catch import errors
  - Test in 3+ different projects

**R3: Style Dictionary Coupling**
- **Risk:** Too tightly coupled to Style Dictionary
- **Impact:** Medium
- **Mitigation:**
  - Make Style Dictionary optional
  - Support custom build commands
  - Document how to use alternatives

### Market Risks

**R4: Figma Builds Native Feature**
- **Risk:** Figma launches native token export, making Synkio obsolete
- **Impact:** Critical
- **Mitigation:**
  - Focus on developer workflow (Git PRs, CI/CD)
  - Multi-destination support (GitHub, GitLab, webhooks)
  - Variable ID tracking (unique feature)
  - Diversify to other design tools eventually

**R5: Low Adoption**
- **Risk:** Not enough users adopt the tool
- **Impact:** High
- **Mitigation:**
  - Free tier with generous limits
  - Great documentation & examples
  - Community building (Discord, GitHub Discussions)
  - Content marketing (blog posts, tutorials)

### Business Risks

**R6: Monetization Challenges**
- **Risk:** Users unwilling to pay for SaaS
- **Impact:** High
- **Mitigation:**
  - Validate with Phase 2 (free dashboard)
  - Survey users about willingness to pay
  - Start with sponsorship/donations
  - Keep open-source core attractive

---

## Resource Requirements

### Phase 1 (4 weeks)
- **Developer:** 1 full-time
- **Designer:** 0 (no UI work)
- **Cost:** ~$0 (personal time + free tier hosting)

### Phase 2 (6 weeks)
- **Developer:** 1 full-time
- **Designer:** 0.5 (part-time for landing page)
- **Cost:** ~$200 (Vercel Pro, domain, analytics)

### Phase 3 (12 weeks)
- **Developer:** 1 full-time
- **Designer:** 0.5 (part-time for dashboard UI)
- **Cost:** ~$500 (hosting, Stripe, email services, etc.)

### Year 2+
- **Team:** 2-3 developers + 1 designer
- **Cost:** Variable based on revenue

---

## Open Questions

### Product
- [ ] Should we support Style Dictionary alternatives (e.g., Theo, custom)?
- [ ] Should we build a Figma plugin for import (reverse sync)?
- [ ] What output formats are most valuable? (iOS, Android, Flutter?)

### Business
- [ ] Open-source license: MIT or dual-license (OSS core + commercial dashboard)?
- [ ] Branding: "Synkio Tokens" or just "Synkio"?
- [ ] Support channels: Discord? GitHub Discussions? Email only?

### Technical
- [ ] Monorepo structure: Keep all in one repo or split dashboard?
- [ ] Database: PostgreSQL or simpler (SQLite for MVP)?
- [ ] Deployment: Vercel only or multi-cloud?

---

## Next Actions

### Immediate (This Week)
1. ✅ Customize Agent OS standards
2. ✅ Create Phase 1A spec and requirements
3. ⏳ Run `/create-tasks` to generate tasks breakdown
4. ⏳ Run `/implement-tasks` to start implementation

### Short-term (Next 2 Weeks)
1. Complete Phase 1A (context system)
2. Start Phase 1B (configuration)
3. Test package in standalone project
4. Update README with basic docs

### Medium-term (Next Month)
1. Complete Phase 1 (publish beta to NPM)
2. Get 10+ beta testers
3. Gather feedback
4. Plan Phase 2 (dashboard)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-06 | Initial roadmap created |

---

**Questions or feedback?** Open an issue or discussion in the [GitHub repo](https://github.com/yourusername/synkio).
