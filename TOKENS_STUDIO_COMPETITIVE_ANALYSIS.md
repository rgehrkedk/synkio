# Synkio Competitive Analysis
## Tokens Studio Internal Assessment

**Analysis Date:** December 2025
**Classification:** Internal Strategy Document
**Prepared by:** Product Strategy Team

---

## Executive Summary

Synkio is an open-source CLI tool that enables Figma variable synchronization to code without requiring Figma's Enterprise plan. Using a hybrid plugin + API architecture, it bypasses Figma's Enterprise-only Variables REST API to provide teams with programmatic access to their design tokens.

### Key Findings

| Aspect | Assessment |
|--------|------------|
| **Threat Level** | Moderate - targets underserved mid-market segment |
| **Technical Innovation** | High - ID-based diffing is superior to file-based approaches |
| **Market Position** | Complementary/Alternative to Tokens Studio |
| **Pricing** | Open source (MIT) vs our freemium model |
| **Target Segment** | Teams already using Figma Variables who need API access |

### Strategic Implication

Synkio addresses the same market pain point as Tokens Studio (Enterprise API lock-in) but with a fundamentally different philosophy: **work with Figma Variables** rather than replace them.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Technical Architecture Analysis](#2-technical-architecture-analysis)
3. [Market Context](#3-market-context)
4. [Competitive Positioning](#4-competitive-positioning)
5. [SWOT Analysis](#5-swot-analysis)
6. [Strategic Recommendations](#6-strategic-recommendations)
7. [Outreach Strategy & Partnership Offers](#7-outreach-strategy--partnership-offers)

---

## 1. Product Overview

### What is Synkio?

Synkio (`synkio` on npm, v1.4.0) is a CLI-first design token synchronization tool consisting of:

1. **Figma Plugin** - Captures variables and stores them in `sharedPluginData`
2. **CLI Tool** - Fetches plugin data via standard Figma API, generates W3C DTCG tokens

**License:** MIT (fully open source)
**Repository:** https://github.com/rgehrkedk/synkio

### Core Value Proposition

> "Sync Figma variables to code. No Enterprise plan required."

Unlike Tokens Studio, which creates a parallel token system within Figma, Synkio works with **native Figma Variables** as the source of truth.

### Feature Matrix

| Feature | Synkio | Tokens Studio |
|---------|--------|---------------|
| Figma Plan Required | Free/Professional | Free/Professional |
| Token Source | Figma Variables (native) | Tokens Studio tokens (proprietary) |
| Sync Direction | Bidirectional | Figma → Code |
| Format | W3C DTCG | Custom + DTCG |
| Git Integration | Manual (CLI outputs files) | Native plugin sync |
| CSS Generation | Built-in | Requires build pipeline |
| Documentation Site | Built-in generator | Cloud docs (Pro) |
| Graph Engine | No | Yes (core differentiator) |
| Multi-tool Support | Figma only | Figma, Penpot, Framer |
| Pricing | Free (OSS) | Freemium ($35+/seat) |

---

## 2. Technical Architecture Analysis

### 2.1 Hybrid Plugin + API Approach

**Innovation Rating: HIGH**

Synkio's architecture cleverly bypasses Figma's Enterprise API restriction:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Figma Plugin   │ ──────► │  sharedPluginData│ ──────► │   CLI Tool      │
│  (captures vars)│         │  (standard API)  │         │ (generates JSON)│
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                           │                            │
        ▼                           ▼                            ▼
   Uses Plugin API            Fetched via                   Outputs DTCG
   (available to all)         /v1/files/{id}               token files
                              (no Enterprise)
```

**How It Works:**
1. Plugin reads variables using Plugin API (available on all plans)
2. Plugin stores data in `sharedPluginData` attached to document node
3. CLI fetches this data via standard REST API endpoint
4. No Enterprise Variables API needed

**Technical Details:**
- Namespace: `synkio` (with `token_vault` legacy fallback)
- Chunking: Handles large token sets via `chunk_0`, `chunk_1`, etc.
- Storage limit workaround: Data split across multiple keys

### 2.2 ID-Based Diffing System

**Innovation Rating: VERY HIGH**

This is Synkio's most significant technical advantage over file-based comparison tools (including our current approach).

**The Problem It Solves:**

| Scenario | File-Based Diff | ID-Based Diff (Synkio) |
|----------|-----------------|------------------------|
| `colors.primary` → `colors.brand.primary` | Detected as DELETE + ADD | Detected as RENAME |
| Variable deleted | Detected as DELETE | Detected as DELETE |
| Same path, new variable | Cannot distinguish | Correctly identifies as NEW |

**Implementation:**
```typescript
// Composite key format
"${variableId}:${collection}.${mode}"
// e.g., "VariableID:123:456:theme.light"

// Enables O(1) lookup of previous state by permanent ID
```

**Breaking Change Detection:**
- Path changes (renames) → Blocking
- Deleted variables → Blocking
- Deleted modes → Blocking
- Mode renames → Blocking
- Value changes → Non-blocking
- New variables → Non-blocking

**Assessment:** This approach is objectively superior to file-based diffing for detecting renames vs. deletions. **We should consider adopting a similar approach.**

### 2.3 Sync Pipeline

The CLI follows a 14-step orchestration pattern:

```
1. Load Config              8.  Write Baseline to Disk
2. Fetch from Figma         9.  Split Tokens by Strategy
3. Normalize Tokens         10. Build File Map
4. Filter Phantom Modes     11. Process & Merge Styles
5. Read Existing Baseline   12. Write Files
6. Handle First Sync        13. Generate Intermediate Format
7. Compare Baselines        14. Run Build Pipeline
```

**Strengths:**
- Clear separation of concerns
- Each step independently testable
- Comprehensive error handling
- Supports multiple output modes (preview, backup, watch, regenerate)

**Limitations:**
- Single-threaded (no parallelization)
- Polling-based watch mode (no webhooks)
- No incremental sync support

### 2.4 Token Format & Output

**DTCG Compliance:** Full W3C DTCG v1.0 support

```json
{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc",
      "$description": "Primary brand color",
      "$extensions": {
        "com.figma": {
          "variableId": "VariableID:123:456",
          "scopes": ["FRAME_FILL"]
        }
      }
    }
  }
}
```

**Split Strategies:**
| Strategy | Output | Use Case |
|----------|--------|----------|
| `mode` | `theme.light.json`, `theme.dark.json` | Theme separation |
| `group` | `globals.colors.json`, `globals.spacing.json` | Primitive organization |
| `none` | `theme.json` | Simple projects |

**Built-in Outputs:**
- DTCG JSON files
- CSS custom properties (with utility classes)
- Static documentation site
- Custom build script integration

### 2.5 Bidirectional Workflow

**Unique Capability:** Export-baseline command enables code-first workflows

```
Token Files (DTCG JSON)
        ↓
   File Discoverer
        ↓
    Token Parser
        ↓
  Baseline Builder
        ↓
export-baseline.json → Import to Figma Plugin
```

**Use Cases:**
1. Migrating from other token tools (Style Dictionary, etc.)
2. Bootstrap Synkio from existing codebase
3. Roundtrip verification (Figma → Code → Figma)

**Limitation:** Initial export-baseline creates entries without Figma variable IDs, falling back to heuristic matching on first sync.

---

## 3. Market Context

### 3.1 The Enterprise API Problem

**Figma's Variables REST API** is exclusively available on Enterprise plan ($75/user/month).

**What This Restricts:**
- Programmatic read access to variable definitions
- Automated design-to-code synchronization
- CI/CD integration with design tokens
- Third-party tool integrations

**Market Impact:**
- Professional plan: $15/seat → Variables API inaccessible
- Organization plan: $45/seat → Variables API inaccessible
- Enterprise plan: $75/seat → Full access

**The Gap:** Teams with 10-50 users on Professional/Organization plans need API access but don't need Enterprise governance features.

### 3.2 Community Sentiment

From Figma Community Forums:

> "Restricting this API to Enterprise customers only diminishes significantly the value of this feature for small/mid-size teams"

> "Variables is available to everyone, yet if you want to actually make use of it in the relationship between designer → developer → product, you have to pay Figma for enterprise."

> "This completely alienates solo Design Ops consultants from building CI/CD pipelines"

**Observation:** There is significant pent-up demand for Variables API access without Enterprise pricing.

### 3.3 W3C DTCG Adoption (October 2025)

The Design Tokens specification reached **v1.0 stable** in October 2025.

**Implications:**
- Standardization momentum makes vendor-neutral solutions more attractive
- Teams increasingly want to avoid proprietary lock-in
- Both Tokens Studio and Synkio support DTCG format

### 3.4 Market Segmentation

| Segment | Primary Tool Choice | Why |
|---------|---------------------|-----|
| Enterprise (500+ seats) | Figma Enterprise | Full API access, governance |
| Mid-Market (50-500) | Tokens Studio or Synkio | Need API access, cost-conscious |
| Small Teams (10-50) | Synkio | Budget priority, simple needs |
| Freelancers | Tokens Studio (Solo) or Synkio | Advanced features vs free |
| Open Source Advocates | Synkio | MIT license, transparency |

---

## 4. Competitive Positioning

### 4.1 Philosophical Difference

| Approach | Tokens Studio | Synkio |
|----------|---------------|--------|
| Philosophy | "Replace Figma Variables with our more powerful token system" | "Unlock existing Figma Variables via API workaround" |
| Lock-in | Medium (tokens stored in plugin) | Low (works with native Variables) |
| Migration | Requires adopting Tokens Studio workflow | Works with existing Figma files |
| Learning Curve | Higher (new concepts) | Lower (familiar Figma Variables) |

### 4.2 Feature Comparison

**Where Tokens Studio Wins:**
- Graph Engine for complex token relationships
- Multi-tool support (Penpot, Framer)
- Native Git sync from plugin
- Pro documentation features
- Established community and support

**Where Synkio Wins:**
- Zero cost (MIT open source)
- Works with native Figma Variables
- CLI-first workflow (developer-friendly)
- Built-in CSS generation
- Built-in docs site generator
- ID-based diffing (superior change detection)
- Bidirectional sync (export-baseline)

### 4.3 Target Audience Overlap

```
                    ┌─────────────────────────────────────────┐
                    │         Need Variables API Access       │
                    │         (Without Enterprise)            │
                    └─────────────────────────────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
    ┌─────────────┐           ┌─────────────────┐          ┌─────────────┐
    │   Prefer    │           │   Either works  │          │   Prefer    │
    │Tokens Studio│           │                 │          │   Synkio    │
    └─────────────┘           └─────────────────┘          └─────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
    - Need Graph Engine         - Basic token sync          - Use Figma Variables
    - Multi-tool workflow       - Cost-conscious            - CLI-first workflow
    - Willing to pay            - Small teams               - Open source priority
    - Need Pro docs                                         - Bidirectional sync
```

### 4.4 Pricing Impact

| Scenario | Tokens Studio Cost | Synkio Cost | Savings |
|----------|-------------------|-------------|---------|
| 10-person team (basic) | ~$350/mo (Starter+) | $0 | $350/mo |
| 25-person team | ~$875/mo (Organization) | $0 | $875/mo |
| Solo designer | ~$35/mo (Studio Solo) | $0 | $35/mo |

**Assessment:** For teams that only need token sync (no Graph Engine, no multi-tool), Synkio provides equivalent functionality at zero cost.

---

## 5. SWOT Analysis

### From Synkio's Perspective

| Strengths | Weaknesses |
|-----------|------------|
| Open source (MIT license) | No commercial support |
| Works with native Figma Variables | Single-tool (Figma only) |
| ID-based diffing (superior) | No Graph Engine equivalent |
| CLI-first (developer-friendly) | Less polished UX than plugins |
| Bidirectional sync | Local-only baseline (no cloud) |
| Built-in CSS + docs generation | No version history |
| Zero switching cost | Less feature-rich overall |

| Opportunities | Threats |
|---------------|---------|
| Large underserved mid-market | Figma could lower API access barrier |
| W3C DTCG standardization momentum | Tokens Studio could add similar diffing |
| Developer preference for CLI tools | Figma could block plugin workaround |
| Cost-conscious market conditions | Better-funded competitors |

### From Tokens Studio's Perspective

| Strengths We Have | Risks From Synkio |
|-------------------|-------------------|
| Established brand and community | Price-sensitive customers may switch |
| Graph Engine (unique) | CLI-first developers may prefer Synkio |
| Multi-tool support | "Good enough" for basic token sync |
| Pro features (docs, governance) | Open source momentum in market |
| Commercial support | ID-based diffing could become expected |

---

## 6. Strategic Recommendations

### 6.1 Immediate Actions (0-3 months)

#### A. Technical Parity Assessment
**Priority: High**

Evaluate adopting ID-based diffing approach:
- Synkio's change detection is objectively superior
- Reduces false positives on renames
- Improves user trust in sync operations

**Recommendation:** Assign engineering team to prototype ID-based comparison for next major version.

#### B. Market Messaging Refinement
**Priority: Medium**

Clarify differentiation in marketing materials:
- Emphasize Graph Engine as unique capability
- Highlight multi-tool support (Penpot, Framer)
- Position Pro features as worth the investment
- Acknowledge but don't dismiss Synkio's valid use case

### 6.2 Short-term Strategy (3-6 months)

#### C. Consider Free Tier Enhancement
**Priority: Medium**

Evaluate whether free tier should include:
- Basic bidirectional sync (Synkio has this)
- Built-in CSS generation (reduces build complexity)
- Simple documentation export

**Rationale:** Synkio's all-free model may capture users before they evaluate paid alternatives.

#### D. Monitor Adoption Metrics
**Priority: High**

Track:
- Synkio npm downloads and GitHub stars
- Community forum mentions
- Customer churn to Synkio
- New customer objections mentioning Synkio

### 6.3 Medium-term Strategy (6-12 months)

#### E. Strengthen Enterprise Value Proposition
**Priority: Medium**

Focus on capabilities Synkio cannot match:
- Governance and approval workflows
- Team collaboration features
- Advanced security and compliance
- Professional services and support

#### F. Consider Acquisition or Partnership
**Priority: Low (Monitor)**

If Synkio gains significant traction:
- Acquire to eliminate competition
- Partner to integrate best features
- Hire key contributors

**Current Assessment:** Too early for this decision. Monitor market adoption.

### 6.4 Watch List Items

| Item | Trigger | Response |
|------|---------|----------|
| Synkio reaches 10k npm weekly downloads | Active threat | Accelerate differentiation strategy |
| Major company publicly adopts Synkio | Social proof concern | Case study counter-campaign |
| Figma restricts plugin data access | Synkio neutralized | N/A |
| Synkio adds multi-tool support | Differentiation eroded | Fast-follow or acquire |

---

## 7. Outreach Strategy & Partnership Offers

### 7.1 Owner Profile

**Repository:** https://github.com/rgehrkedk/synkio
**Owner:** rgehrkedk (GitHub handle)
**Project Status:** Active development (v1.4.0, recent commits)
**License:** MIT (allows commercial use and acquisition)

**Inferred Profile:**
- Technical founder/developer (strong TypeScript, CLI tooling expertise)
- Design systems background (understands token workflows)
- Open source advocate (MIT license, public repo)
- Likely freelancer, agency, or small company (not VC-backed)

### 7.2 Outreach Approach

#### Initial Contact Strategy

**Recommended Channels (in order):**
1. GitHub - Open an issue titled "Partnership Discussion - Tokens Studio"
2. LinkedIn - Direct message to owner
3. Twitter/X - If publicly active
4. Email - If discoverable from GitHub profile

**Tone:** Respectful, collaborative, non-threatening. Acknowledge their innovation.

#### Opening Message Template

```
Subject: Tokens Studio + Synkio - Exploring Collaboration

Hi [Name],

I'm [Your Name] from Tokens Studio. We've been following Synkio's
development and are genuinely impressed by your approach to the
design tokens space.

Your ID-based diffing system and the hybrid plugin + CLI architecture
are elegant solutions to problems we're also working on. Rather than
compete, we're exploring whether there's an opportunity to collaborate.

Would you be open to a 30-minute call to explore possibilities? No
strings attached - just an exploratory conversation.

Best,
[Your Name]
Tokens Studio
```

### 7.3 Partnership Offer Options

#### Option A: Technology Licensing (Low Commitment)

**What We Offer:**
- One-time license fee: $15,000 - $50,000
- Ongoing royalty: 2-5% of revenue from features using licensed tech
- Public attribution in product

**What We Get:**
- License to ID-based diffing algorithm
- Rights to integrate hybrid plugin architecture
- Technical consultation (10-20 hours)

**Pitch Angle:**
> "Your ID-based diffing is genuinely innovative. We'd like to license
> this technology for our product while you continue developing Synkio
> independently."

**Pros:** Low risk, owner keeps full control, immediate value
**Cons:** Doesn't eliminate competition, limited strategic benefit

---

#### Option B: Integration Partnership (Medium Commitment)

**What We Offer:**
- Co-marketing and joint case studies
- Featured integration in Tokens Studio docs
- Technical support and API access
- Revenue share on referred customers: 15-25%
- Engineering collaboration on shared features

**What We Get:**
- Synkio recommends Tokens Studio for advanced features
- Shared roadmap visibility
- First-mover advantage on integration
- Reduced direct competition

**Structure:**
```
┌─────────────────┐      ┌─────────────────────┐
│     Synkio      │ ───► │    Tokens Studio    │
│  (Basic sync)   │      │  (Advanced features)│
└─────────────────┘      └─────────────────────┘
        │                         │
        └─────── Upgrade Path ────┘
```

**Pitch Angle:**
> "Your CLI-first approach complements our plugin-first model. Let's
> create an upgrade path where Synkio users naturally grow into Tokens
> Studio when they need Graph Engine, multi-tool support, or Pro docs."

**Pros:** Win-win, expands total market, reduces competition
**Cons:** Requires ongoing coordination, owner must agree to positioning

---

#### Option C: Acqui-hire (High Commitment)

**What We Offer:**
- Competitive salary + signing bonus: $150,000 - $250,000 base
- Equity stake in Tokens Studio: 0.5% - 2.0%
- Title: Senior/Staff Engineer or Technical Lead
- Full creative control over CLI tooling
- Remote-first role

**What We Get:**
- Owner joins Tokens Studio team
- Full rights to Synkio codebase
- ID-based diffing integrated into core product
- CLI expertise in-house
- Synkio sunset or rebrand as "Tokens Studio CLI"

**Pitch Angle:**
> "You've built something special. We'd love to have you lead our CLI
> tooling efforts and integrate your innovations into Tokens Studio.
> You'd have the resources to take your ideas further while reaching
> millions of designers and developers."

**Pros:** Eliminates competition, acquires talent and technology
**Cons:** High cost, owner may prefer independence, integration challenges

---

#### Option D: Full Acquisition (Highest Commitment)

**What We Offer:**
- Cash acquisition: $100,000 - $500,000
  - Base: Calculated on 3-5x annual value (npm downloads, GitHub stars)
  - Premium: For strategic value of technology
- Retention bonus for 12-24 month transition
- Option to join team or advisor role

**Valuation Framework:**
| Factor | Weight | Synkio Assessment |
|--------|--------|-------------------|
| Technology (ID-diffing, CLI) | 40% | High value |
| User base (npm downloads) | 25% | Early stage |
| Community (GitHub stars) | 15% | Growing |
| Strategic threat elimination | 20% | Moderate |

**Pitch Angle:**
> "We'd like to acquire Synkio and integrate it as our official CLI
> offering. This gives you an exit while ensuring your work reaches
> the widest possible audience through Tokens Studio's distribution."

**Pros:** Complete control, eliminates competition, technology + community acquired
**Cons:** Highest cost, complex negotiation, potential community backlash

---

### 7.4 Negotiation Talking Points

#### Value We Bring to Owner

1. **Distribution:** Access to Tokens Studio's existing user base (100k+ plugin installs)
2. **Resources:** Engineering, design, and marketing support
3. **Sustainability:** Ongoing funding vs. unpaid open source work
4. **Credibility:** Association with established brand
5. **Focus:** Let us handle business while they focus on engineering

#### Their Likely Concerns

| Concern | Response |
|---------|----------|
| "I want to stay independent" | Options A & B preserve independence |
| "I don't want Synkio to die" | Commit to maintaining CLI product line |
| "What about existing users?" | Ensure backward compatibility, migration path |
| "I'm not interested in working for a company" | Offer advisor role or pure acquisition |
| "The community will be upset" | Joint announcement, emphasize continuity |

#### Our Non-Negotiables

- Rights to ID-based diffing technology
- Ability to prevent direct competition (in some form)
- Clear IP transfer for any acquisition

#### Our Flexibility

- Timeline (not urgent)
- Payment structure (cash, equity, royalties)
- Ongoing involvement (full-time, advisor, none)
- Brand treatment (rebrand, co-brand, maintain)

### 7.5 Conversation Flow

```
Phase 1: Discovery (Call 1)
├── Build rapport
├── Understand their motivations
├── Learn about their roadmap
└── Gauge interest in collaboration

Phase 2: Exploration (Call 2)
├── Present partnership spectrum (A-D)
├── Discuss which options interest them
├── Identify deal-breakers
└── Get ballpark expectations

Phase 3: Proposal (Call 3)
├── Present formal offer
├── Address concerns
├── Negotiate terms
└── Agree on next steps

Phase 4: Due Diligence (If proceeding)
├── Code review
├── Legal review (IP, license)
├── Financial terms finalization
└── Transition planning
```

### 7.6 Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Owner not interested | Medium | Lead with respect, multiple options |
| Asks for too much | Low | Have walk-away threshold defined |
| Competitor approaches them first | Low | Move quickly but not desperately |
| Community backlash on acquisition | Medium | Joint announcement, maintain OSS |
| Integration fails post-acquisition | Medium | Clear technical due diligence |

### 7.7 Decision Matrix

**When to Pursue Each Option:**

| Scenario | Recommended Offer |
|----------|-------------------|
| Owner wants to stay independent, just wants recognition | Option A (License) |
| Owner open to collaboration, wants ongoing relationship | Option B (Partnership) |
| Owner burned out on OSS, interested in full-time role | Option C (Acqui-hire) |
| Owner wants exit, ready to move on | Option D (Acquisition) |
| Owner not interested in any collaboration | Monitor and compete |

### 7.8 Recommended First Offer

Based on current analysis, we recommend starting with **Option B (Integration Partnership)** as the opening position:

**Rationale:**
1. Lowest barrier to acceptance
2. Tests relationship before deeper commitment
3. Provides value to both parties immediately
4. Preserves optionality for future acquisition
5. Doesn't require significant upfront capital

**Fallback:** If owner is looking for an exit, pivot to Option C or D.
**Walk-away:** If owner is hostile or demands unreasonable terms.

---

## Appendix A: Technical Deep Dive

### Synkio Codebase Structure

```
packages/
├── cli/                          # Main npm package
│   ├── src/
│   │   ├── cli/commands/         # init, sync, import, export-baseline, etc.
│   │   ├── core/
│   │   │   ├── sync/             # Pipeline orchestration
│   │   │   ├── compare/          # ID-based diffing (key innovation)
│   │   │   ├── tokens/           # Token processing, splitting
│   │   │   ├── import/           # Figma JSON import
│   │   │   ├── export/           # Code → Figma baseline
│   │   │   ├── docs/             # Static site generator
│   │   │   └── css/              # CSS custom properties
│   │   ├── types/                # Zod schemas
│   │   └── utils/                # Shared utilities
│   └── USER_GUIDE.md             # Complete documentation
└── figma-plugin/
    └── synkio-sync/              # Minimal capture plugin
```

### Key Files for Further Analysis

| File | Purpose | Innovation Level |
|------|---------|------------------|
| `core/compare/variable-comparator.ts` | ID-based diffing | HIGH |
| `core/sync/pipeline.ts` | Main orchestration | MEDIUM |
| `core/figma.ts` | API client with chunking | MEDIUM |
| `core/baseline.ts` | State management | MEDIUM |
| `core/export/baseline-builder.ts` | Bidirectional sync | HIGH |

### Test Coverage

30 test files covering:
- Core comparison logic
- Token splitting strategies
- Baseline management
- Integration tests

Framework: Vitest (modern, fast, ESM-native)

---

## Appendix B: Market Research Sources

1. [Tokens Studio Pricing](https://tokens.studio/pricing)
2. [W3C Design Tokens v1.0 Announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
3. [Figma Forum: Variables API Discussion](https://forum.figma.com/t/whys-the-variables-api-only-available-on-enterprise-plans/51451)
4. [Figma Plans and Features](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features)
5. [Supernova State of Design Tokens 2024](https://www.supernova.io/state-of-design-tokens)
6. [Tokens Studio Penpot Integration](https://tokens.studio/blog/tokens-studio-penpot-bringing-native-open-standard-design-tokens-to-everyone)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2025 | Product Strategy Team | Initial analysis |
| 1.1 | December 2025 | Business Development | Added outreach strategy and partnership offers |

---

*This document is for internal strategic planning purposes. Distribution should be limited to relevant stakeholders.*
