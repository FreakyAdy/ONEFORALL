# 🚀 ONEFORALL (ofa)

**Universal AI Collaboration Tool for GitHub Teams**

> Let multiple developers and their AI agents work on the same repo without merge conflicts.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

---

## The Problem

When 2+ developers use AI coding agents (Cursor, Copilot, Gemini, Claude) on the same repo:

- 🔴 AI agents don't know about each other
- 🔴 No ownership boundaries — two agents edit the same files
- 🔴 Merge conflicts discovered too late, after hours of work
- 🔴 No shared context between different AI platforms

## The Solution

**ONEFORALL** adds zone-based ownership, cross-platform AI instructions, and CI enforcement:

```
┌─────────────────────────────────────────┐
│              ofa init                   │
│  Scans repo → detects zones → creates  │
│  AI configs for ALL platforms           │
└─────────────────────────────────────────┘
         │
    ┌────┴─────────────────┐
    ▼                      ▼
┌──────────────┐   ┌──────────────┐
│ Dev A (you)  │   │ Dev B (team) │
│ AI: Gemini   │   │ AI: Cursor   │
│              │   │              │
│ ofa claim    │   │ ofa claim    │
│  backend/    │   │  frontend/   │
└──────────────┘   └──────────────┘
    │                      │
    └──────┬───────────────┘
           ▼
  ┌────────────────┐
  │ GitHub Actions │
  │ ofa guard      │
  │ blocks bad PRs │
  └────────────────┘
```

## Quick Start

```bash
# Install globally
npm install -g oneforall-ai

# Navigate to your project
cd your-project

# Initialize — scans structure, generates configs
ofa init

# Claim your zone
ofa claim backend --user your-github-username

# Check status
ofa status

# Verify boundaries before committing
ofa guard
```

## What Gets Generated

Running `ofa init` creates these files in your project:

| File | Purpose |
|------|---------|
| `.ofa/config.yml` | Ownership manifest — zones, locks, rules |
| `.github/copilot-instructions.md` | GitHub Copilot context |
| `.cursor/rules/ofa-ownership.mdc` | Cursor AI rules |
| `GEMINI.md` | Gemini / Antigravity context |
| `AGENTS.md` | GitHub Copilot Agents context |
| `CLAUDE.md` | Claude context (appended, not overwritten) |
| `.github/CODEOWNERS` | GitHub PR review enforcement |
| `.github/workflows/ofa-guard.yml` | CI boundary check |

## Commands

| Command | Description |
|---------|-------------|
| `ofa init` | Initialize ONEFORALL in your project |
| `ofa claim <zone>` | Claim ownership of a zone |
| `ofa release <zone>` | Release a previously claimed zone |
| `ofa status` | Show current zone ownership |
| `ofa guard` | Check changes respect boundaries |
| `ofa sync` | Regenerate all AI config files |

## Supported AI Platforms

| Platform | Config File | Status |
|----------|-------------|--------|
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ Supported |
| Cursor | `.cursor/rules/ofa-ownership.mdc` | ✅ Supported |
| Gemini / Antigravity | `GEMINI.md` | ✅ Supported |
| Claude | `CLAUDE.md` | ✅ Supported |
| GitHub Copilot Agents | `AGENTS.md` | ✅ Supported |
| Windsurf / Codeium | Coming soon | 🔜 Planned |

## How It Works

### 1. Zones
Your project is divided into **zones** — logical areas like `backend/`, `frontend/`, `shared/`. Each zone maps to specific directories.

### 2. Claiming
A developer **claims** a zone with `ofa claim`. This:
- Locks the zone (with TTL auto-expiry)
- Updates all AI config files so every platform knows the boundaries
- Updates CODEOWNERS for PR review enforcement

### 3. Guarding
`ofa guard` checks that your changes only touch files within your claimed zone. It runs:
- Locally as a pre-commit check
- In CI via GitHub Actions on every PR

### 4. Syncing
When team composition changes, `ofa sync` regenerates all config files from `.ofa/config.yml`.

## Example `.ofa/config.yml`

```yaml
version: 1
project:
  name: my-app
  type: fullstack

zones:
  backend:
    paths: [src/api/, src/services/]
    owner: alice
    description: Backend API and business logic
  frontend:
    paths: [src/components/, src/pages/]
    owner: bob
    description: Frontend UI components
  shared:
    paths: [src/types/, src/utils/]
    owner: null
    description: Shared code — requires all owners to review
    require_all_owners: true

rules:
  - Never modify files outside your claimed zone
  - Shared zone changes require all-owner review
  - Always use feature branches
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE)

---

Built with ❤️ for the AI-augmented development community.
