# Token Security Guide

This guide covers best practices for managing GitHub Personal Access Tokens (PATs) used with the Synkio Figma plugin.

## Minimal Permissions Required

When creating a GitHub token, use the **minimum required scopes**:

| Workflow | Required Scopes | Reason |
|----------|----------------|--------|
| Read-only (fetch baseline) | `repo` (public) or `contents:read` (private) | Read export-baseline.json |
| Create PRs | `repo` | Create branches and pull requests |

### Creating a Token with Minimal Scopes

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Enter a description (e.g., "Synkio Figma Plugin")
3. Select only the `repo` scope
4. Set an expiration date (90 days recommended)
5. Click **Generate token**
6. Copy and save the token immediately (it won't be shown again)

**Quick link with pre-selected scopes:**
```
https://github.com/settings/tokens/new?scopes=repo&description=Synkio%20Figma%20Plugin
```

## Fine-Grained PATs (Recommended)

For enhanced security, use GitHub's Fine-Grained Personal Access Tokens:

1. Go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Set a token name and expiration
4. Under **Repository access**, select **Only select repositories** and choose your design tokens repo
5. Under **Permissions**, grant:
   - **Contents**: Read and write
   - **Pull requests**: Read and write (if creating PRs)
6. Click **Generate token**

### Benefits of Fine-Grained PATs

- Limited to specific repositories
- Granular permission control
- Better audit logging
- Required expiration dates

## Token Storage

### Where Tokens Are Stored

Synkio stores your GitHub token using Figma's `clientStorage` API:

- **Encrypted at rest** by Figma
- **Per-user, per-plugin** storage
- **Not shared** with other users or plugins
- **Not visible** in Figma file data

### Where Tokens Are NOT Stored

Your token is never stored in:

- ❌ `sharedPluginData` (visible to all file editors)
- ❌ Browser localStorage
- ❌ Plain text files
- ❌ Figma file metadata

## Best Practices

### Token Hygiene

1. **Set expiration dates** — Create tokens with 90-day expiration
2. **Rotate regularly** — Replace tokens before they expire
3. **Use descriptive names** — Include "Synkio" in the token name for easy identification
4. **Monitor usage** — Check GitHub token activity in Settings → Tokens
5. **One token per use** — Don't reuse tokens across multiple apps

### When to Rotate Tokens

Rotate your token immediately if:

- A team member with access leaves
- You suspect the token may be compromised
- The token has been accidentally exposed
- 90 days have passed since creation

### Team Considerations

- Each team member should use their own token
- Avoid sharing tokens between team members
- Consider using a service account for CI/CD workflows

## Revoking Access

### Revoke the Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Find the Synkio token
3. Click **Delete** or **Revoke**

### Disconnect in Figma

1. Open the Synkio plugin
2. Go to **Setup**
3. Click **Edit** on the GitHub connection
4. Click **Disconnect**

## Security Checklist

Before deploying to your team:

- [ ] Using Fine-Grained PAT (recommended) or classic token with minimal scopes
- [ ] Token limited to specific repositories
- [ ] Expiration date set (90 days or less)
- [ ] Token stored securely (never in code or shared files)
- [ ] Team members using individual tokens
- [ ] Token rotation schedule established

## Common Security Questions

### Is my token visible to other Figma users?

No. Tokens are stored in `clientStorage`, which is private to each user.

### Can plugin collaborators see my token?

No. The token is only accessible to your Figma account.

### What happens if I share the Figma file?

The token does not travel with the file. Each user must configure their own GitHub connection.

### Is the token sent to any third-party servers?

No. The token is only sent directly to GitHub's API (`api.github.com`).

## Reporting Security Issues

If you discover a security vulnerability in Synkio, please report it responsibly by emailing the maintainers or opening a private security advisory on GitHub.
