# TokenBridge - Produktkrav og Analyse

**Dokument version:** 1.0
**Dato:** 2025-12-03
**Status:** Draft

---

## Executive Summary

TokenBridge er en hosted service der giver designere mulighed for at synkronisere Figma Variables til kodebase uden teknisk viden om Git eller CI/CD. Kernen i produktet er "Sync to Node" konceptet, hvor tokens gemmes som `sharedPluginData` pa en Figma node og kan lases via Figma REST API.

**Primaer differentiator:** Designer-first UX hvor synkronisering sker med et klik fra Figma, uden at forlade applikationen.

---

## 1. User Journeys

### 1.1 Designer Journey

#### Opdagelse af TokenBridge

**Scenarie:** Sarah er designer hos et mellemstort bureau. Hun har oprettet et design system i Figma med Variables, men udviklingsteamet klager over at tokens altid er outdated.

```
Opdagelseskanaler:
1. Figma Community plugin soegning: "design tokens sync"
2. LinkedIn artikel om "designer-friendly token workflow"
3. Anbefaling fra developer kollega
4. Webinar om design tokens workflow
```

**Foerste beroring:**
- Finder TokenBridge plugin i Figma Community
- Ser "Zero Git knowledge required" tagline
- Installerer gratis plugin

#### Foerste Gang Setup Flow

```
Step 1: Plugin Installation (30 sek)
+------------------------------------------+
|  [TokenBridge Plugin]                    |
|                                          |
|  Welcome! Let's connect your tokens.     |
|                                          |
|  [Sign in with Google]                   |
|  [Sign in with email]                    |
|                                          |
|  No account? [Create free account]       |
+------------------------------------------+

Step 2: Workspace Connection (1 min)
+------------------------------------------+
|  Select workspace                        |
|                                          |
|  [+] Create new workspace                |
|  [ ] Join existing (enter invite code)   |
|                                          |
|  Workspace name: [My Design System    ]  |
|                                          |
|  [Continue]                              |
+------------------------------------------+

Step 3: Collection Selection (30 sek)
+------------------------------------------+
|  Which collections to sync?              |
|                                          |
|  [x] Brand (12 modes, 847 vars)          |
|  [x] Theme (2 modes, 234 vars)           |
|  [x] Globals (1 mode, 156 vars)          |
|  [ ] Components (experimental)           |
|                                          |
|  Total: 1,237 variables                  |
|                                          |
|  [Start syncing]                         |
+------------------------------------------+

Step 4: First Sync Complete (5 sek)
+------------------------------------------+
|  Tokens synced successfully!             |
|                                          |
|  1,237 variables exported                |
|  Node ID: 123:456                        |
|                                          |
|  Your developer can now connect          |
|  the destination in the dashboard.       |
|                                          |
|  [Open Dashboard]  [Done]                |
+------------------------------------------+
```

**Total onboarding tid:** < 3 minutter

#### Daglig Brug Flow

```
Scenario: Sarah har opdateret brand farver

1. Aabner TokenBridge plugin i Figma
2. Ser "3 changes detected" badge
3. Klikker "Review changes"

+------------------------------------------+
|  Changes since last sync                 |
|                                          |
|  Modified (3):                           |
|  - brand.primary.500: #0066CC -> #0055AA |
|  - brand.primary.600: #0052A3 -> #004488 |
|  - brand.primary.700: #003D7A -> #003366 |
|                                          |
|  [Cancel]  [Sync changes]                |
+------------------------------------------+

4. Klikker "Sync changes"
5. Ser "Changes pushed! PR created."
6. Kopierer PR link til Slack
```

#### Historik og Versionering

```
+------------------------------------------+
|  Sync History                            |
|                                          |
|  Today                                   |
|  - 14:32  Sarah   3 modified   [View PR] |
|  - 09:15  Sarah   1 added      [View PR] |
|                                          |
|  Yesterday                               |
|  - 16:45  Marcus  12 modified  [View PR] |
|  - 11:20  Sarah   2 deleted    [View PR] |
|                                          |
|  [Load more]                             |
+------------------------------------------+
```

#### Notifications

**In-Figma notifications:**
- Badge pa plugin ikon ved pending changes
- Toast ved sync success/failure

**Email notifications (konfigurerbar):**
- Daglig summary af team changes
- Alert ved breaking changes (deleted tokens)
- PR merge confirmation

**Slack integration:**
- Kanal besked ved hver sync
- Thread replies ved PR comments

---

### 1.2 Developer Journey

#### Repository Connection

```
Dashboard: Destinations

+------------------------------------------+
|  Connect your repository                 |
|                                          |
|  [GitHub]  [GitLab]  [Bitbucket]        |
|                                          |
|  Or use:                                 |
|  [Webhook]  [S3/CDN]  [npm publish]      |
+------------------------------------------+

GitHub Connection Flow:
1. Authorize TokenBridge GitHub App
2. Select repository
3. Configure branch and path

+------------------------------------------+
|  GitHub Configuration                    |
|                                          |
|  Repository:  [org/design-tokens     v]  |
|  Base branch: [main                  v]  |
|  PR branch:   [tokenbridge/sync-{date}]  |
|                                          |
|  Output path: [src/tokens/           ]   |
|                                          |
|  [Test connection]  [Save]               |
+------------------------------------------+
```

#### Output Format Konfiguration

```
+------------------------------------------+
|  Output Formats                          |
|                                          |
|  [x] TypeScript (src/tokens/index.ts)    |
|      Export style: [named exports    v]  |
|                                          |
|  [x] CSS Variables (src/tokens/vars.css) |
|      Prefix: [--token-              ]    |
|                                          |
|  [ ] iOS Swift                           |
|  [ ] Android XML                         |
|  [ ] JSON (W3C DTCG format)              |
|                                          |
|  Preview output:                         |
|  +--------------------------------------+|
|  | // tokens/index.ts                   ||
|  | export const brand = {               ||
|  |   primary: {                         ||
|  |     500: '#0055AA',                  ||
|  |     ...                              ||
|  +--------------------------------------+|
|                                          |
|  [Save configuration]                    |
+------------------------------------------+
```

#### PR Review Flow

```
GitHub PR created by TokenBridge:

Title: [TokenBridge] Sync design tokens (2025-12-03)

## Changes Summary
- 3 tokens modified
- 0 tokens added
- 0 tokens deleted

## Modified Tokens
| Token Path | Old Value | New Value |
|------------|-----------|-----------|
| brand.primary.500 | #0066CC | #0055AA |
| brand.primary.600 | #0052A3 | #004488 |
| brand.primary.700 | #003D7A | #003366 |

## Variable ID Tracking
All changes preserve Figma Variable IDs for migration safety.

## Synced by
Sarah (sarah@company.com) via TokenBridge

---
Generated by TokenBridge
```

#### CI/CD Integration

```yaml
# .github/workflows/tokens.yml
name: Token Validation

on:
  pull_request:
    paths:
      - 'src/tokens/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate tokens
        uses: tokenbridge/validate-action@v1
        with:
          schema: dtcg  # W3C Design Token Community Group

      - name: Check breaking changes
        uses: tokenbridge/breaking-check@v1
        with:
          base-ref: main
          notify-slack: true
```

---

### 1.3 Admin/Team Lead Journey

#### Team Management

```
Dashboard: Team

+------------------------------------------+
|  Team Members                            |
|                                          |
|  Sarah (sarah@co.com)      Admin    [x]  |
|  Marcus (marcus@co.com)    Editor   [x]  |
|  Lisa (lisa@co.com)        Viewer   [x]  |
|                                          |
|  [+ Invite member]                       |
|                                          |
|  Pending invites:                        |
|  - john@co.com (expires in 6 days)       |
+------------------------------------------+

Roles:
- Admin: Full access, billing, team management
- Editor: Can sync, configure outputs
- Viewer: Can view history, no sync access
```

#### Permissions Matrix

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| Sync tokens | Yes | Yes | No |
| View history | Yes | Yes | Yes |
| Configure outputs | Yes | Yes | No |
| Add destinations | Yes | No | No |
| Manage team | Yes | No | No |
| View audit log | Yes | Yes | No |
| Billing | Yes | No | No |

#### Audit/Compliance Dashboard

```
+------------------------------------------+
|  Audit Log                               |
|                                          |
|  Filter: [All actions v] [Last 30 days v]|
|                                          |
|  2025-12-03 14:32:15                     |
|  Sarah synced 3 tokens to GitHub         |
|  PR #847 created                         |
|                                          |
|  2025-12-03 14:30:22                     |
|  Sarah modified collections selection    |
|  Added: Components                       |
|                                          |
|  2025-12-03 09:15:03                     |
|  Sarah synced 1 token to GitHub          |
|  PR #846 created, merged                 |
|                                          |
|  [Export CSV]  [Export JSON]             |
+------------------------------------------+
```

---

## 2. Feature Requirements

### 2.1 Core Features (P0 - Must Have)

#### F1: Figma Plugin - Token Export

**User Story:**
> Som designer vil jeg kunne eksportere mine Figma Variables til TokenBridge med et klik, sa mine tokens bliver tilgaengelige for udviklere.

**Acceptance Criteria:**
- [ ] Plugin viser alle Variable Collections i Figma fil
- [ ] Bruger kan vaelge hvilke collections der skal synkes
- [ ] Export genererer komplet JSON med alle token vaerdier
- [ ] Variable IDs bevares gennem hele flowet
- [ ] Alias references oplosses korrekt (fx `{brand.primary.500}`)
- [ ] Export understotter COLOR, FLOAT, STRING, BOOLEAN typer
- [ ] Progress indikator under export
- [ ] Fejlhaandtering med klare beskeder

**Technical Complexity:** Medium

---

#### F2: Sync to Node Storage

**User Story:**
> Som designer vil jeg have mine tokens gemt pa en Figma node, sa TokenBridge cloud service kan laese dem via REST API.

**Acceptance Criteria:**
- [ ] Tokens gemmes som `sharedPluginData` pa en usynlig frame
- [ ] Data chunkes i 90KB dele (under Figma's 100KB limit)
- [ ] Metadata inkluderer: version, timestamp, fileKey, variableCount
- [ ] Eksisterende data overskrives ved re-sync
- [ ] Node oprettes automatisk hvis den ikke findes
- [ ] Node er usynlig og laast (forhindrer utilsigtet sletning)

**Technical Complexity:** Low (allerede implementeret i nuvaerende plugin)

---

#### F3: Cloud Service - Figma Polling

**User Story:**
> Som developer vil jeg have TokenBridge til automatisk at opdage ændringer i Figma, sa jeg ikke skal bede designeren om at synke manuelt.

**Acceptance Criteria:**
- [ ] Service poller Figma REST API hvert 5. minut (konfigurerbart)
- [ ] Kun filer med aendringer siden sidst processeres
- [ ] API rate limits respekteres (Figma: 720 req/min)
- [ ] Polling kan trigges manuelt fra dashboard
- [ ] Webhook support for instant detection (Figma Enterprise)

**Technical Complexity:** Medium

**API Endpoint:**
```
GET https://api.figma.com/v1/files/{fileKey}/nodes
?ids={nodeId}
&plugin_data=shared
```

**Response parsing:**
```typescript
interface FigmaNodeResponse {
  nodes: {
    [nodeId: string]: {
      document: {
        sharedPluginData: {
          [namespace: string]: {
            registry_0: string;
            registry_1: string;
            chunkCount: string;
            updatedAt: string;
          }
        }
      }
    }
  }
}
```

---

#### F4: GitHub Integration

**User Story:**
> Som developer vil jeg have token aendringer leveret som GitHub Pull Requests, sa jeg kan reviewe og merge dem via standard workflow.

**Acceptance Criteria:**
- [ ] OAuth flow til GitHub authorization
- [ ] Repository selection fra brugerens tilgaengelige repos
- [ ] Automatisk branch oprettelse (fx `tokenbridge/sync-2025-12-03`)
- [ ] PR oprettes med struktureret beskrivelse
- [ ] Diff summary i PR body (added/modified/deleted)
- [ ] PR assignees/reviewers kan konfigureres
- [ ] Auto-merge option for non-breaking changes

**Technical Complexity:** Medium

**PR Template:**
```markdown
## TokenBridge Sync

**Synced by:** {{userName}} ({{userEmail}})
**Timestamp:** {{syncedAt}}
**Figma file:** [{{fileName}}]({{figmaUrl}})

### Changes Summary
- {{addedCount}} tokens added
- {{modifiedCount}} tokens modified
- {{deletedCount}} tokens deleted

### Modified Tokens
{{#each modifiedTokens}}
| `{{path}}` | `{{oldValue}}` | `{{newValue}}` |
{{/each}}

### Breaking Changes
{{#if hasBreakingChanges}}
**Warning:** This sync contains breaking changes (deleted tokens).
{{else}}
No breaking changes detected.
{{/if}}

---
*Generated by [TokenBridge](https://tokenbridge.io)*
```

---

#### F5: Output Format Configuration

**User Story:**
> Som developer vil jeg kunne konfigurere hvilke output formater der genereres, sa tokens passer til vores tech stack.

**Note:** Selve token transformation haandteres af **Style Dictionary** (open source).
TokensBridge leverer baseline JSON til repository, hvorefter Style Dictionary bygger platform-specifikke outputs.

**Acceptance Criteria:**
- [ ] Konfigurerbar Style Dictionary config i dashboard
- [ ] Preview af output format for validation
- [ ] Automatisk Style Dictionary build efter sync (optional)
- [ ] Support for custom Style Dictionary transforms

**Supported formats (via Style Dictionary):**
- TypeScript: `export const tokens = {...} as const`
- CSS: `:root { --token-name: value; }`
- JSON: W3C DTCG format
- iOS Swift: `enum Tokens { static let ... }`
- Android XML: `<color name="...">#...</color>`

**Technical Complexity:** Low (delegeres til Style Dictionary)

---

### 2.2 Important Features (P1 - Should Have)

#### F6: Change Detection & Diff

**User Story:**
> Som designer vil jeg se praecis hvilke tokens der er aendret for jeg synker, sa jeg kan validere mine aendringer.

**Acceptance Criteria:**
- [ ] Side-by-side sammenligning: current vs last sync
- [ ] Kategorisering: Added, Modified, Deleted
- [ ] Filtering pa type (color, number, string)
- [ ] Search i changes
- [ ] Undo mulighed (revert til sidste sync)

**Technical Complexity:** Low

---

#### F7: Team Workspace

**User Story:**
> Som team lead vil jeg kunne invitere teammedlemmer til workspace, sa vi kan samarbejde om design tokens.

**Acceptance Criteria:**
- [ ] Invite via email
- [ ] Role-based access (Admin, Editor, Viewer)
- [ ] Workspace settings (name, default branch, etc.)
- [ ] Activity feed for team
- [ ] SSO integration (Enterprise)

**Technical Complexity:** Medium

---

#### F8: Sync History

**User Story:**
> Som developer vil jeg kunne se historik over alle syncs, sa jeg kan spore hvornaar specifikke aendringer blev lavet.

**Acceptance Criteria:**
- [ ] Kronologisk liste af alle syncs
- [ ] Filter pa bruger, dato, type
- [ ] Link til PR for hver sync
- [ ] Diff view for hver sync
- [ ] Export til CSV/JSON

**Technical Complexity:** Low

---

#### F9: Notifications

**User Story:**
> Som developer vil jeg modtage notifikationer naar tokens aendres, sa jeg ved hvornaar der er nye PR's at reviewe.

**Acceptance Criteria:**
- [ ] Email: Konfigurerbar (instant, daily digest, off)
- [ ] Slack: Webhook integration
- [ ] In-app: Badge og toast notifications
- [ ] Filter: Kun breaking changes, alle changes, etc.

**Technical Complexity:** Low

---

### 2.3 Nice-to-Have Features (P2 - Could Have)

#### F10: GitLab/Bitbucket Support

**User Story:**
> Som developer der bruger GitLab vil jeg kunne modtage tokens som Merge Requests.

**Technical Complexity:** Medium

---

#### F11: Webhook Destination

**User Story:**
> Som developer vil jeg kunne modtage tokens via webhook, sa jeg kan integrere med custom systemer.

**Technical Complexity:** Low

---

#### F12: Variable ID Migration Assistant

**User Story:**
> Som developer vil jeg have hjaelp til at migrere codebase referencer naar tokens renames, baseret pa Variable ID tracking.

**Technical Complexity:** High

---

#### F13: Figma Comments Integration

**User Story:**
> Som designer vil jeg kunne se PR status direkte i Figma som kommentarer pa relevante komponenter.

**Technical Complexity:** High

---

#### F14: Design Token Documentation

**User Story:**
> Som team lead vil jeg have auto-genereret dokumentation af vores tokens.

**Technical Complexity:** Medium

---

## 3. Teknisk Arkitektur

### 3.1 System Komponenter

```
                                    +-------------------+
                                    |                   |
                                    |  TokenBridge Web  |
                                    |  Dashboard        |
                                    |  (React/Next.js)  |
                                    |                   |
                                    +--------+----------+
                                             |
                                             | REST API
                                             v
+------------------+              +----------+----------+              +------------------+
|                  |   Webhook/   |                     |   GitHub     |                  |
|  Figma Plugin    |   Notify     |  TokenBridge API    |   API        |  GitHub/GitLab   |
|  (TypeScript)    +------------->|  (Node.js/Hono)     +------------->|  Repository      |
|                  |              |                     |              |                  |
+------------------+              +----------+----------+              +------------------+
                                             |
                                             | Poll
                                             v
                                  +----------+----------+
                                  |                     |
                                  |  Figma REST API     |
                                  |  (External)         |
                                  |                     |
                                  +---------------------+

+------------------+              +---------------------+
|                  |              |                     |
|  PostgreSQL      |<------------>|  TokenBridge API    |
|  (Data)          |              |                     |
|                  |              +---------------------+
+------------------+
                                  +---------------------+
+------------------+              |                     |
|                  |<-------------|  Background Jobs    |
|  Redis           |              |  (Polling, Syncs)   |
|  (Queue/Cache)   |              |                     |
+------------------+              +---------------------+
```

### 3.2 Data Models

#### User

```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;

  // Relations
  workspaces: WorkspaceMember[];
  oauthConnections: OAuthConnection[];
}

interface OAuthConnection {
  id: string;
  userId: string;
  provider: 'github' | 'gitlab' | 'figma' | 'google';
  providerUserId: string;
  accessToken: string;           // Encrypted
  refreshToken?: string;         // Encrypted
  expiresAt?: Date;
  scopes: string[];
}
```

#### Workspace

```typescript
interface Workspace {
  id: string;                    // UUID
  name: string;
  slug: string;                  // URL-friendly, unique
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;

  // Billing
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Relations
  members: WorkspaceMember[];
  figmaFiles: FigmaFile[];
  destinations: Destination[];
  syncs: Sync[];
}

interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  invitedAt: Date;
  joinedAt?: Date;
}
```

#### Figma File

```typescript
interface FigmaFile {
  id: string;                    // UUID
  workspaceId: string;
  figmaFileKey: string;          // Figma's file key
  figmaFileName: string;
  registryNodeId: string;        // Node ID where tokens are stored

  // Sync config
  selectedCollectionIds: string[];
  lastSyncedAt?: Date;
  lastSyncedBy?: string;         // User ID

  // Cached data
  cachedTokenCount: number;
  cachedCollections: string[];   // Collection names
}
```

#### Destination

```typescript
interface Destination {
  id: string;                    // UUID
  workspaceId: string;
  type: 'github' | 'gitlab' | 'bitbucket' | 'webhook' | 's3';
  name: string;                  // User-friendly name

  // GitHub specific
  githubOwner?: string;
  githubRepo?: string;
  githubBaseBranch?: string;
  githubInstallationId?: number;

  // Output config
  outputPath: string;            // e.g., "src/tokens/"
  outputFormats: OutputFormat[];

  // PR config
  prBranchPrefix: string;        // e.g., "tokenbridge/"
  prAssignees: string[];
  prReviewers: string[];
  autoMerge: boolean;

  createdAt: Date;
  updatedAt: Date;
}

interface OutputFormat {
  type: 'typescript' | 'css' | 'json' | 'ios-swift' | 'android-xml';
  filename: string;
  options: Record<string, unknown>;
}
```

#### Sync

```typescript
interface Sync {
  id: string;                    // UUID
  workspaceId: string;
  figmaFileId: string;
  destinationId: string;
  triggeredBy: string;           // User ID or 'system'

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;

  // Changes
  tokensAdded: number;
  tokensModified: number;
  tokensDeleted: number;
  hasBreakingChanges: boolean;

  // Result
  prUrl?: string;
  prNumber?: number;
  commitSha?: string;

  // Snapshot (for history/diff)
  beforeSnapshot: TokenSnapshot;
  afterSnapshot: TokenSnapshot;
}

interface TokenSnapshot {
  id: string;
  syncId: string;
  tokens: Record<string, TokenEntry>;
  createdAt: Date;
}

interface TokenEntry {
  path: string;                  // e.g., "brand.primary.500"
  value: string | number;
  type: 'color' | 'number' | 'string' | 'boolean';
  variableId: string;            // Figma Variable ID
  collection: string;
  mode?: string;
}
```

### 3.3 API Design

#### Authentication

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

#### Workspaces

```
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
DELETE /api/workspaces/:id

GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/members/invite
DELETE /api/workspaces/:id/members/:memberId
PATCH  /api/workspaces/:id/members/:memberId
```

#### Figma Files

```
GET    /api/workspaces/:wid/figma-files
POST   /api/workspaces/:wid/figma-files
GET    /api/workspaces/:wid/figma-files/:id
PATCH  /api/workspaces/:wid/figma-files/:id
DELETE /api/workspaces/:wid/figma-files/:id

POST   /api/workspaces/:wid/figma-files/:id/sync
GET    /api/workspaces/:wid/figma-files/:id/preview
```

#### Destinations

```
GET    /api/workspaces/:wid/destinations
POST   /api/workspaces/:wid/destinations
GET    /api/workspaces/:wid/destinations/:id
PATCH  /api/workspaces/:wid/destinations/:id
DELETE /api/workspaces/:wid/destinations/:id

POST   /api/workspaces/:wid/destinations/:id/test
```

#### Syncs

```
GET    /api/workspaces/:wid/syncs
GET    /api/workspaces/:wid/syncs/:id
GET    /api/workspaces/:wid/syncs/:id/diff
```

#### Plugin API (special endpoints for Figma plugin)

```
POST   /api/plugin/notify-sync
       Body: { fileKey, nodeId, userId }

GET    /api/plugin/config
       Query: fileKey
       Response: workspace config for this file
```

#### Example API Responses

**GET /api/workspaces/:wid/syncs**
```json
{
  "data": [
    {
      "id": "sync_abc123",
      "status": "completed",
      "triggeredBy": {
        "id": "user_xyz",
        "name": "Sarah",
        "email": "sarah@company.com"
      },
      "startedAt": "2025-12-03T14:32:15Z",
      "completedAt": "2025-12-03T14:32:18Z",
      "changes": {
        "added": 0,
        "modified": 3,
        "deleted": 0
      },
      "hasBreakingChanges": false,
      "pr": {
        "url": "https://github.com/org/repo/pull/847",
        "number": 847,
        "status": "open"
      }
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "perPage": 20,
    "hasMore": true
  }
}
```

**GET /api/workspaces/:wid/syncs/:id/diff**
```json
{
  "data": {
    "added": [],
    "modified": [
      {
        "path": "brand.primary.500",
        "type": "color",
        "variableId": "brand:eboks:VariableID:8407:177353",
        "before": "#0066CC",
        "after": "#0055AA"
      },
      {
        "path": "brand.primary.600",
        "type": "color",
        "variableId": "brand:eboks:VariableID:8407:177354",
        "before": "#0052A3",
        "after": "#004488"
      }
    ],
    "deleted": []
  }
}
```

### 3.4 Figma Integration

#### Option A: Polling (MVP)

```typescript
// Background job - runs every 5 minutes
async function pollFigmaFiles() {
  const activeFiles = await db.figmaFile.findMany({
    where: { workspace: { plan: { not: 'free' } } }
  });

  for (const file of activeFiles) {
    try {
      const response = await figmaApi.getNode(file.figmaFileKey, file.registryNodeId, {
        plugin_data: 'shared'
      });

      const pluginData = response.nodes[file.registryNodeId]?.document?.sharedPluginData;
      const updatedAt = pluginData?.eboks_tokens?.updatedAt;

      if (updatedAt && new Date(updatedAt) > file.lastSyncedAt) {
        await queueSync(file.id);
      }
    } catch (error) {
      console.error(`Failed to poll file ${file.id}:`, error);
    }
  }
}
```

**Fordele:**
- Simpelt at implementere
- Virker med alle Figma planer

**Ulemper:**
- Delay mellem aendring og sync (op til 5 min)
- API kald selv nar der ikke er aendringer

#### Option B: Figma Webhooks (Enterprise)

```typescript
// Webhook endpoint
app.post('/api/webhooks/figma', async (req, res) => {
  const { event_type, file_key, timestamp } = req.body;

  if (event_type === 'FILE_UPDATE') {
    const file = await db.figmaFile.findFirst({
      where: { figmaFileKey: file_key }
    });

    if (file) {
      await queueSync(file.id);
    }
  }

  res.status(200).send('OK');
});
```

**Fordele:**
- Instant detection
- Ingen unodvendige API kald

**Ulemper:**
- Kun tilgaengeligt for Figma Enterprise
- Kraever webhook setup i Figma

#### Hybrid Approach (Anbefalet)

```typescript
// Plugin notificerer cloud service direkte ved sync
// Cloud service verificerer via API og processerer

// Plugin side (ui.html)
async function notifyCloudService(syncResult) {
  await fetch('https://api.tokenbridge.io/plugin/notify-sync', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({
      fileKey: figma.fileKey,
      nodeId: syncResult.nodeId,
      timestamp: new Date().toISOString()
    })
  });
}

// Server side
app.post('/api/plugin/notify-sync', async (req, res) => {
  const { fileKey, nodeId } = req.body;

  // Verify data by fetching from Figma API
  const tokens = await fetchTokensFromFigma(fileKey, nodeId);

  // Queue sync job
  await syncQueue.add('process-sync', {
    fileKey,
    nodeId,
    tokens,
    userId: req.user.id
  });

  res.json({ status: 'queued' });
});
```

### 3.5 Destination Integrations

#### GitHub App

```typescript
// GitHub App installation flow
app.get('/api/github/install', (req, res) => {
  const installUrl = `https://github.com/apps/tokenbridge/installations/new`;
  res.redirect(installUrl);
});

// Callback after installation
app.get('/api/github/callback', async (req, res) => {
  const { installation_id, setup_action } = req.query;

  // Get installation access token
  const token = await getInstallationToken(installation_id);

  // List accessible repositories
  const repos = await listInstalledRepos(token);

  // Save installation to database
  await db.githubInstallation.create({
    workspaceId: req.session.workspaceId,
    installationId: installation_id,
    accessToken: encrypt(token)
  });
});

// Create PR
async function createPullRequest(destination: Destination, sync: Sync, files: GeneratedFile[]) {
  const octokit = await getOctokitForDestination(destination);

  // Create branch
  const branchName = `${destination.prBranchPrefix}sync-${sync.id}`;
  const baseSha = await getBaseSha(octokit, destination);

  await octokit.git.createRef({
    owner: destination.githubOwner,
    repo: destination.githubRepo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha
  });

  // Commit files
  for (const file of files) {
    await octokit.repos.createOrUpdateFileContents({
      owner: destination.githubOwner,
      repo: destination.githubRepo,
      path: file.path,
      message: `[TokenBridge] Update ${file.path}`,
      content: Buffer.from(file.content).toString('base64'),
      branch: branchName
    });
  }

  // Create PR
  const pr = await octokit.pulls.create({
    owner: destination.githubOwner,
    repo: destination.githubRepo,
    title: `[TokenBridge] Sync design tokens (${new Date().toISOString().split('T')[0]})`,
    body: generatePrBody(sync),
    head: branchName,
    base: destination.githubBaseBranch
  });

  return pr.data;
}
```

---

## 4. Business Model

### 4.1 Pricing Tiers

#### Free Tier - $0/maaned

**Inkluderet:**
- 1 Figma fil
- 1 destination (download only - ingen auto-PR)
- Basic token types (colors, numbers)
- 100 syncs/maaned
- Community support

**Begraensninger:**
- Ingen GitHub/GitLab integration
- Ingen team members
- "Powered by TokenBridge" i output

**Mal:** Lead generation, proof of concept

---

#### Pro Tier - $29/workspace/maaned

**Inkluderet:**
- Unlimited Figma filer
- 5 destinations
- GitHub, GitLab, Bitbucket integration
- Auto-PR creation
- Variable ID tracking
- Alle token types
- 3 team members
- Email support
- Slack notifications

**Ekstra:**
- +$10/ekstra team member
- +$20/ekstra destination beyond 5

**Mal:** SMB, agencies, startups

---

#### Enterprise Tier - Custom pricing (fra $299/maaned)

**Inkluderet:**
- Alt fra Pro
- Unlimited team members
- Unlimited destinations
- SSO/SAML
- Audit logs (90 dage retention)
- Custom output formats
- Self-hosted option
- SLA (99.9% uptime)
- Dedicated support
- Priority feature requests
- Figma Webhook support (instant sync)

**Mal:** Large organizations, compliance-fokuserede virksomheder

### 4.2 Usage Metrics/Limits

| Metric | Free | Pro | Enterprise |
|--------|------|-----|------------|
| Figma files | 1 | Unlimited | Unlimited |
| Destinations | 1 | 5 | Unlimited |
| Team members | 1 | 3 | Unlimited |
| Syncs/month | 100 | 1,000 | Unlimited |
| History retention | 7 days | 90 days | Unlimited |
| API requests/day | - | 10,000 | Unlimited |

### 4.3 Conversion Funnel

```
Awareness (Top of Funnel)
    |
    v  Blog posts, Twitter, Figma Community
+------------------------------------------+
| Figma Community Plugin Page              |
| - 5,000 monthly visitors                 |
| - 15% install rate                       |
+------------------------------------------+
    |
    v  750 installs/month
+------------------------------------------+
| Free Tier Activation                     |
| - First sync completed                   |
| - 60% activation rate                    |
+------------------------------------------+
    |
    v  450 active free users/month
+------------------------------------------+
| Free -> Pro Conversion                   |
| - Triggered by:                          |
|   - Need for GitHub integration          |
|   - Multiple files                       |
|   - Team collaboration                   |
| - 8% conversion rate                     |
+------------------------------------------+
    |
    v  36 new Pro customers/month
+------------------------------------------+
| Pro Retention                            |
| - Monthly churn: 5%                      |
| - Average lifetime: 20 months            |
| - LTV: $580                              |
+------------------------------------------+
```

**Key metrics maal:**
- Install to Activation: 60%
- Free to Pro conversion: 8%
- Monthly Pro churn: < 5%
- NPS: > 50

---

## 5. Konkurrentanalyse

### 5.1 Feature Comparison Matrix

| Feature | TokenBridge | Tokens Studio | Supernova | Specify |
|---------|-------------|---------------|-----------|---------|
| **Designer UX** |
| One-click sync | ++ | - | + | - |
| No Git knowledge | ++ | -- | + | - |
| In-Figma workflow | ++ | ++ | + | + |
| **Developer UX** |
| Auto PR creation | ++ | + | ++ | + |
| Output formats | + | ++ | ++ | ++ |
| CI/CD integration | + | ++ | ++ | + |
| **Technical** |
| Variable ID tracking | ++ | + | + | - |
| Alias resolution | ++ | ++ | ++ | ++ |
| W3C DTCG support | + | ++ | ++ | ++ |
| **Platform** |
| Self-hosted option | + | ++ | - | - |
| Enterprise features | + | + | ++ | + |
| **Pricing** |
| Free tier | Good | Best | Poor | Good |
| Pro pricing | $29/ws | $7.50/seat | $$$ | Unknown |

**Legend:** ++ Excellent, + Good, - Poor, -- Very Poor

### 5.2 Specifik Differentiering

#### vs. Tokens Studio

**Tokens Studio styrker:**
- Modent produkt med stort community
- Gratis for basic brug
- Dybere Figma integration (theming)
- Open source CLI

**TokenBridge differentiering:**
- Designeren skal ikke forsta Git
- Instant sync uden local setup
- Hosted service (no ops)
- Variable ID tracking for migrations

**Positionering:** "Tokens Studio er for teams med techniske designere. TokenBridge er for teams hvor designere fokuserer pa design."

#### vs. Supernova

**Supernova styrker:**
- Fuld dokumentationsplatform
- Enterprise-grade features
- Dybere brand management

**TokenBridge differentiering:**
- Simpel, fokuseret losning
- Signifikant billigere
- Hurtigere onboarding
- Ikke lock-in til platform

**Positionering:** "Supernova er en platform. TokenBridge er et vaerktoj."

### 5.3 Pricing Comparison

| Produkt | Small Team (3 people) | Medium Team (10 people) | Enterprise (50 people) |
|---------|----------------------|------------------------|----------------------|
| **TokenBridge** | $29/mo | $29 + $70 = $99/mo | Custom (~$299+) |
| **Tokens Studio** | Free or $22.50/mo | $75/mo | Custom |
| **Supernova** | ~$200/mo (estimate) | ~$500/mo (estimate) | Custom ($$$) |

---

## 6. Risici og Mitigering

### 6.1 Tekniske Risici

#### R1: Figma API Rate Limits

**Risiko:** Figma's API har rate limits (720 requests/min). Med mange kunder kan vi ramme graenser.

**Impact:** Hoj - kunne stoppe hele servicen

**Mitigering:**
1. Intelligent caching af uaendret data
2. Webhook-first arkitektur (reducerer polling)
3. Batch processing i off-peak timer
4. Per-customer rate limiting
5. Figma Enterprise partnership for hojere limits

#### R2: Plugin Data Size Limit

**Risiko:** Figma har 100KB limit per `sharedPluginData` entry. Store design systems kan overstige dette.

**Impact:** Medium - allerede losti med chunking

**Mitigering:**
1. Chunked storage (90KB chunks) - allerede implementeret
2. Compression af JSON data
3. Selective sync (kun aendrede collections)

#### R3: Figma API Aendringer

**Risiko:** Figma aendrer deres API uden varsel.

**Impact:** Hoj - kunne bryde hele integrationen

**Mitigering:**
1. Versioned API endpoints hvor muligt
2. Comprehensive test suite mod Figma API
3. Feature flags for hurtig rollback
4. Monitoring af Figma changelog
5. Figma partner program for early access

### 6.2 Markedsrisici

#### R4: Figma Bygger Native Feature

**Risiko:** Figma lancerer native "Export to Code" feature der overflodiggor TokenBridge.

**Impact:** Kritisk

**Mitigering:**
1. Focus pa multi-destination (GitHub, GitLab, Bitbucket, Webhook)
2. Enterprise features Figma ikke vil bygge (SSO, audit)
3. Variable ID tracking som unik differentiator
4. Custom transformations
5. Diversificering til andre design tools (evt. Penpot)

**Sandsynlighed:** Medium-hoj. Figma har allerede Dev Mode og Variables. Men de fokuserer typisk pa platform, ikke pipeline tooling.

#### R5: Tokens Studio Laver Hosted Service

**Risiko:** Tokens Studio (vores storste konkurrent) lancerer en hosted version.

**Impact:** Hoj

**Mitigering:**
1. Speed to market - vaer forst
2. Designer-first UX som kernevaerdi
3. Aggressive pricing
4. Feature parity + UX superiority

**Sandsynlighed:** Medium. De har historisk fokuseret pa open source.

### 6.3 Dependency Risici

#### R6: GitHub API Aendringer

**Risiko:** GitHub aendrer deres API eller App permissions.

**Impact:** Medium

**Mitigering:**
1. Abstraktion layer mellem vores kode og GitHub API
2. Multiple Git providers (GitLab, Bitbucket)
3. Webhook destination som fallback

#### R7: Style Dictionary Maintenance

**Risiko:** Style Dictionary (vores output generator) stopper development.

**Impact:** Medium

**Mitigering:**
1. Fork og maintain selv hvis nodvendigt
2. Bidrag aktivt til Style Dictionary
3. Build alternativ transformer hvis nodvendigt

---

## 7. Roadmap

### Phase 1: Private Beta (Month 1-2)

**Mal:** Validering af kernekonceptet med 10-20 early adopters

**Features:**
- [ ] Figma plugin med cloud authentication
- [ ] Single Figma file per workspace
- [ ] GitHub integration (PR creation)
- [ ] TypeScript + CSS output
- [ ] Basic web dashboard
- [ ] Manual sync trigger

**Success criteria:**
- 15+ active beta users
- 50+ syncs completed
- NPS > 40
- < 5% sync failure rate

**Resources:**
- 1 full-stack developer
- 1 designer (part-time)

---

### Phase 2: Public Beta (Month 3-4)

**Mal:** Validering af business model og skalerbarhed

**Features:**
- [ ] Multiple Figma files
- [ ] Team workspaces (invite flow)
- [ ] Sync history view
- [ ] Change diff preview
- [ ] Email notifications
- [ ] GitLab integration
- [ ] Free tier limitations enforced

**Success criteria:**
- 100+ active users
- 5+ paying Pro customers
- Conversion rate > 5%
- Sync latency < 30s

**Resources:**
- 2 full-stack developers
- 1 designer

---

### Phase 3: GA Launch (Month 5-6)

**Mal:** Production-ready service med betal-support

**Features:**
- [ ] Stripe billing integration
- [ ] SSO (Google, GitHub)
- [ ] Slack integration
- [ ] iOS Swift output
- [ ] Android XML output
- [ ] JSON (W3C DTCG) output
- [ ] Audit log (basic)
- [ ] Public docs site
- [ ] Status page

**Success criteria:**
- $1,000 MRR
- 20+ paying customers
- Churn < 8%
- 99.5% uptime

**Resources:**
- 2 full-stack developers
- 1 designer
- 1 customer success (part-time)

---

### Phase 4: Growth (Month 7-12)

**Mal:** Skalering og enterprise readiness

**Features:**
- [ ] Bitbucket integration
- [ ] Webhook destination
- [ ] Custom output formats
- [ ] Variable ID migration assistant
- [ ] SAML SSO (Enterprise)
- [ ] Advanced audit logs
- [ ] Self-hosted option (Enterprise)
- [ ] API for custom integrations
- [ ] Figma Webhook support

**Success criteria:**
- $10,000 MRR
- 100+ paying customers
- 3+ enterprise deals
- NPS > 50

---

### Future Phases (Year 2+)

**Potential features:**
- Figma Comments integration
- Design token documentation generator
- Multi-file dependency resolution
- Token usage analytics
- Penpot integration
- Adobe XD integration (if demand)
- CLI tool for developers
- GitHub Action for validation

---

## Appendix A: Technical Specifications

### A1: Token Format (Internal)

```typescript
// Internal storage format (baseline)
interface TokenRegistry {
  $metadata: {
    version: string;        // "2.0.0"
    exportedAt: string;     // ISO timestamp
    pluginVersion: string;
    fileKey: string;
    fileName: string;
  };
  brand: Record<string, Record<string, TokenValue>>;
  theme: Record<string, Record<string, TokenValue>>;
  globals: Record<string, TokenValue>;
  baseline: Record<string, BaselineEntry>;
  migrations: Migration[];
}

interface TokenValue {
  $value: string | number;
  $type: 'color' | 'number' | 'string' | 'boolean';
  $variableId: string;      // "collection:mode:VariableID:xxx:yyy"
}

interface BaselineEntry {
  path: string;
  value: string | number;
  type: string;
  brand?: string;
  mode?: string;
  collection: string;
}
```

### A2: Output Format Examples

**TypeScript:**
```typescript
// tokens/brand.ts
export const brand = {
  primary: {
    500: '#0055AA',
    600: '#004488',
    700: '#003366'
  },
  secondary: {
    500: '#FF6600'
  }
} as const;

export type BrandTokens = typeof brand;
```

**CSS:**
```css
/* tokens/brand.css */
:root {
  --brand-primary-500: #0055AA;
  --brand-primary-600: #004488;
  --brand-primary-700: #003366;
  --brand-secondary-500: #FF6600;
}
```

**W3C DTCG JSON:**
```json
{
  "brand": {
    "primary": {
      "500": {
        "$value": "#0055AA",
        "$type": "color"
      },
      "600": {
        "$value": "#004488",
        "$type": "color"
      }
    }
  }
}
```

### A3: Plugin Message Protocol

```typescript
// Plugin -> UI messages
type PluginMessage =
  | { type: 'collections-loaded'; collections: CollectionInfo[] }
  | { type: 'export-complete'; data: ExportOutput }
  | { type: 'registry-synced'; nodeId: string; variableCount: number }
  | { type: 'progress'; message: string }
  | { type: 'error'; message: string };

// UI -> Plugin messages
type UIMessage =
  | { type: 'get-collections' }
  | { type: 'export-tokens'; selectedCollectionIds: string[] }
  | { type: 'sync-registry'; selectedCollectionIds: string[] }
  | { type: 'close' };
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Variable** | Figma's native token storage (introduced 2023) |
| **Variable Collection** | Group of related variables (e.g., "Brand", "Theme") |
| **Mode** | Variant of a collection (e.g., "light", "dark", "eboks", "nykredit") |
| **Variable ID** | Unique identifier for a Figma Variable (`VariableID:xxx:yyy`) |
| **Baseline** | Flat representation of all tokens with their Variable IDs |
| **Sync to Node** | Process of exporting tokens to a Figma node's sharedPluginData |
| **sharedPluginData** | Figma storage that can be read via REST API |
| **DTCG** | Design Token Community Group (W3C standard for token format) |

---

*Dokument slut*
