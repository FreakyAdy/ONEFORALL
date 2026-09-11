<div align="center">

# 🚀 `ofa`
### Universal AI Collaboration Tool for GitHub Teams

**Let multiple developers and their AI agents work on the same repo without merge conflicts.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![Install via GitHub](https://img.shields.io/badge/install-github%3AFreakyAdy%2FONEFORALL-blue.svg)](#-installation)
[![Tests](https://img.shields.io/badge/tests-10%2F10%20passing-brightgreen.svg)](#-testing--verification)
[![Contributing Guide](https://img.shields.io/badge/contributing-guide-blue.svg)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#-quick-start)

<p align="center">
  <a href="#-quick-demo">Quick Demo</a> •
  <a href="#-the-problem">The Problem</a> •
  <a href="#-how-oneforall-solves-it">The Solution</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-complete-command-reference">Commands</a> •
  <a href="#-real-world-walkthrough-full-team-workflow">Walkthrough</a> •
  <a href="#-testing--verification">Tests</a> •
  <a href="#-faq">FAQ</a>
</p>

</div>

---

## ⚡ Quick Demo

Initializing a project, claiming zones, and checking boundaries — in under 30 seconds:

```bash
$ ofa init --yes
```

```text
  ╔══════════════════════════════════════════╗
  ║    🚀 ONEFORALL — Project Initialization   ║
  ╚══════════════════════════════════════════╝

  📁 Scanning project structure...

  ✔ Project type detected: next.js
  ✔ Directories found: 12
  ✔ Files found: 47

  📋 Detected 4 ownership zone(s):

     backend  → src/api/, src/services/
     frontend → src/components/, src/pages/
     shared   → src/types/, src/utils/
     infra    → .github/, docker/

  ⚙️  Generating configuration...
  ✔ .ofa/config.yml
  📝 Generating AI config files...
  ✔ .github/copilot-instructions.md
  ✔ .cursor/rules/ofa-ownership.mdc
  ✔ GEMINI.md
  ✔ AGENTS.md
  ✔ CLAUDE.md
  ✔ .github/CODEOWNERS
  ✔ .github/workflows/ofa-guard.yml

  ✅ ONEFORALL initialized successfully!
```

```bash
$ ofa claim backend --user alice
```

```text
  🔒 Claiming zone "backend" for @alice...
  ✔ Zone "backend" claimed by @alice (expires in 24h).
  📝 Updating AI config files...
  ✔ All config files updated.

  Your AI agent will now see that you own: backend
  Other developers' AI agents will be told NOT to touch your zone.
```

```bash
$ ofa status
```

```text
  ╔══════════════════════════════════════════╗
  ║    🛡️  ONEFORALL — Ownership Status       ║
  ╚══════════════════════════════════════════╝

  Project: my-app (next.js)

  Zone       Owner      Paths                          Status
  ────────── ────────── ────────────────────────────── ──────────
  backend    @alice     src/api/, src/services/         🔴 Claimed
             expires in ~24h
  frontend   @bob       src/components/, src/pages/     🔴 Claimed
             expires in ~24h
  shared     —          src/types/, src/utils/          🟢 Free    🔗
  infra      —          .github/, docker/               🟢 Free
```

---

## 💡 The Problem

### What happens when 2+ developers use AI agents on the same repo

Imagine this scenario:

> **Alice** is building the backend API using **Gemini/Antigravity**.
> **Bob** is building the frontend UI using **Cursor**.
> Both are working on the same GitHub repo at the same time.

Without coordination, here's what goes wrong:

| Step | What Happens | Result |
| :--- | :--- | :--- |
| 1 | Alice asks Gemini: *"Add a user authentication endpoint"* | Gemini creates `src/api/auth.ts`, modifies `src/types/user.ts` |
| 2 | Bob asks Cursor: *"Add a login page with user type imports"* | Cursor also modifies `src/types/user.ts` with different changes |
| 3 | Both push to GitHub | 💥 **Merge conflict** in `src/types/user.ts` |
| 4 | Alice asks Gemini to "fix the merge conflict" | Gemini resolves it **wrong** — deletes Bob's type definitions |
| 5 | Bob's frontend breaks | Hours of work wasted, trust in AI agents destroyed |

**The core issue:** Each AI agent operates in isolation. Gemini doesn't know Cursor exists. Copilot doesn't know Claude is editing files. There is no shared "awareness" between platforms.

### Why existing solutions don't work

| Approach | Why It Fails |
| :--- | :--- |
| "Just use branches" | AI agents still edit the same files — the conflict is discovered at merge time, not prevented |
| "Talk to each other" | Doesn't scale. Breaks down with 3+ people. AI agents can't hear you talking |
| "Use CODEOWNERS" | Only enforces PR reviews — doesn't tell AI agents what NOT to touch |
| Git file locking (`git lfs lock`) | Too granular, doesn't work with AI agents, requires manual management |

---

## 🛡️ How ONEFORALL Solves It

ONEFORALL introduces three concepts:

### 1. 🗺️ Zones — Divide the codebase into owned areas

Instead of file-level locking, ONEFORALL divides your project into **zones** — logical areas like "backend", "frontend", "shared". Each zone maps to specific directories.

```yaml
# .ofa/config.yml
zones:
  backend:
    paths: [src/api/, src/services/, src/models/]
    owner: alice
  frontend:
    paths: [src/components/, src/pages/, src/styles/]
    owner: bob
  shared:
    paths: [src/types/, src/utils/]
    owner: null
    require_all_owners: true  # Changes need review from ALL zone owners
```

### 2. 📝 Cross-Platform AI Instructions — Every agent knows the rules

When Alice claims `backend`, ONEFORALL regenerates config files for **every AI platform** simultaneously:

- **Gemini** reads `GEMINI.md` → sees *"You own backend/. Do NOT touch frontend/ (owned by @bob)"*
- **Cursor** reads `.cursor/rules/ofa-ownership.mdc` → sees the same boundaries
- **Copilot** reads `.github/copilot-instructions.md` → sees the same boundaries
- **Claude** reads `CLAUDE.md` → sees the same boundaries

**Every AI agent, regardless of platform, gets the same ownership context.**

### 3. 🛡️ Guard — Enforce boundaries in pre-commit hooks and CI

Even if an AI agent ignores the instructions (they sometimes do), `ofa guard` catches boundary violations:

- **Locally:** Run `ofa guard --staged` as a pre-commit hook
- **In CI:** The auto-generated GitHub Actions workflow runs `ofa guard --strict` on every PR
- **CODEOWNERS:** GitHub requires the zone owner to approve any PR touching their files

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ofa init                                │
│   Scans repo → auto-detects zones → generates AI configs for   │
│   ALL platforms from a single .ofa/config.yml source of truth   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Developer A    │  │  Developer B    │  │  Developer C    │
│  AI: Gemini     │  │  AI: Cursor     │  │  AI: Copilot    │
│                 │  │                 │  │                 │
│  ofa claim      │  │  ofa claim      │  │  ofa claim      │
│   backend/      │  │   frontend/     │  │   infra/        │
│                 │  │                 │  │                 │
│  GEMINI.md ←    │  │  .cursor/ ←    │  │  copilot- ←     │
│  auto-generated │  │  auto-generated │  │  instructions   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │   GitHub Actions CI   │
                  │   ofa guard --strict  │
                  │                       │
                  │   ✔ Ownership check   │
                  │   ✔ Boundary enforce  │
                  │   ✔ CODEOWNERS review │
                  └───────────────────────┘
```

### How the pieces fit together

```
.ofa/config.yml          ← Single source of truth (you edit this)
       │
       ├──→ GEMINI.md                          (Gemini / Antigravity reads this)
       ├──→ AGENTS.md                          (GitHub Copilot Agents reads this)
       ├──→ CLAUDE.md                          (Claude reads this — appended, not overwritten)
       ├──→ .cursor/rules/ofa-ownership.mdc    (Cursor reads this)
       ├──→ .github/copilot-instructions.md    (GitHub Copilot reads this)
       ├──→ .github/CODEOWNERS                 (GitHub enforces PR reviews)
       └──→ .github/workflows/ofa-guard.yml    (CI blocks boundary violations)
```

---

## 🚀 Quick Start

### Installation

```bash
# Install globally from GitHub (works on Windows, macOS, Linux)
npm install -g github:FreakyAdy/ONEFORALL

# Verify installation
ofa --version
```

### 30-Second Setup

```bash
# 1. Navigate to your project
cd your-project

# 2. Set your GitHub username (stored locally in .ofa/identity)
ofa whoami --set your-github-handle

# 3. Initialize (scans structure, generates all AI configs & CODEOWNERS)
ofa init --yes

# 4. Claim your zone and auto-commit
ofa claim backend --commit

# 5. Verify your setup with doctor
ofa doctor

# 6. Push to GitHub
git push
```

That's it. Every AI agent in your project now knows who owns what.

---

## 📋 Complete Command Reference

| Command | What it does | Key Flags |
| :--- | :--- | :--- |
| [`ofa init`](#ofa-init--initialize-oneforall) | Scans project structure, detects zones, generates all AI configs | `-y, --yes`, `--force` |
| [`ofa claim <zone>`](#ofa-claim-zone--claim-a-zone) | Locks a zone for you, updates all AI instructions & CODEOWNERS | `-u, --user`, `--ttl`, `--commit` |
| [`ofa release <zone>`](#ofa-release-zone--release-a-zone) | Unlocks a zone (verifies owner; supports force release) | `-u, --user`, `--force`, `--commit` |
| [`ofa status`](#ofa-status--show-ownership-dashboard) | Terminal dashboard of active locks, owners, and rules | `--json` |
| [`ofa guard`](#ofa-guard--check-ownership-boundaries) | Boundary check preventing out-of-zone edits (local & CI) | `--staged`, `--strict`, `-u, --user` |
| [`ofa sync`](#ofa-sync--regenerate-all-configs) | Regenerates all platform configs from `.ofa/config.yml` | `--commit` |
| [`ofa whoami`](#ofa-whoami--developer-identity) | Views or configures persistent developer GitHub identity | `--set <handle>`, `--clear` |
| [`ofa doctor`](#ofa-doctor--diagnostic-self-check) | System diagnostics: verifies CLI, identity, zones & engine | |

---

### `ofa init` — Initialize ONEFORALL

Scans your project, auto-detects zones from directory structure, and generates all config files.

```bash
# Interactive mode (asks for project name and zone confirmation)
ofa init

# Non-interactive mode (accept all defaults)
ofa init --yes

# Force reinitialize (overwrite existing .ofa/config.yml)
ofa init --force
```

**What it does:**
1. Scans your directory structure (up to 2 levels deep)
2. Detects your project type (Next.js, React, Vue, Express, Django, Flask, monorepo, etc.)
3. Maps directories to ownership zones based on common patterns
4. Creates `.ofa/config.yml` with detected zones
5. Generates AI config files for all supported platforms
6. Generates `CODEOWNERS` and GitHub Actions CI workflow

**Auto-detected zones:**

| Zone | Matched Directories |
| :--- | :--- |
| `backend` | `backend/`, `server/`, `api/`, `src/api/`, `src/server/`, `src/routes/`, `src/controllers/`, `src/services/`, `src/models/` |
| `frontend` | `frontend/`, `client/`, `web/`, `src/components/`, `src/pages/`, `src/views/`, `components/`, `pages/` |
| `shared` | `shared/`, `common/`, `lib/`, `src/lib/`, `src/types/`, `src/utils/`, `src/shared/`, `types/` |
| `database` | `db/`, `database/`, `migrations/`, `prisma/`, `drizzle/`, `supabase/` |
| `infra` | `infra/`, `terraform/`, `docker/`, `.github/`, `k8s/` |
| `docs` | `docs/`, `documentation/`, `wiki/` |
| `mobile` | `mobile/`, `ios/`, `android/` |
| `tests` | `test/`, `tests/`, `__tests__/`, `e2e/`, `cypress/`, `playwright/` |

**Auto-detected project types:** Next.js, React, Vue, Angular, Express, FastAPI, Django, Flask, Rust, Go, .NET, Java, Flutter, React Native, monorepo (Turborepo/Lerna/pnpm workspaces)

---

### `ofa claim <zone>` — Claim a zone

Locks a zone for a developer. All AI config files are regenerated immediately so every platform sees the new ownership.

```bash
# Claim with explicit username
ofa claim backend --user alice

# Claim and auto-commit to git (never auto-pushes)
ofa claim backend --commit

# Claim with custom TTL (auto-expires after 48 hours)
ofa claim frontend --user bob --ttl 48

# If you previously set your identity via `ofa whoami --set <handle>`, no --user is needed:
ofa claim backend
```

**Example output:**

```text
  🔒 Claiming zone "backend" for @alice...
  ✔ Zone "backend" claimed by @alice (expires in 24h).
  📝 Updating AI config files...
  ✔ All config files updated.

  Your AI agent will now see that you own: backend
  Other developers' AI agents will be told NOT to touch your zone.
```

**What happens when you claim:**
1. The developer's GitHub handle is validated (rejects spaces to protect `CODEOWNERS` syntax)
2. The zone's `owner` field in `.ofa/config.yml` is set to your handle
3. A lock entry is created with a `claimed_at` timestamp and `expires_at` TTL
4. **All AI config files are regenerated** — every platform immediately sees the change
5. `CODEOWNERS` is updated so GitHub requires your review for PRs touching your zone
6. If `--commit` was passed, the updated config and AI rules are staged and committed to git

**Conflict handling:**

```bash
$ ofa claim backend --user bob
```
```text
  🔒 Claiming zone "backend" for @bob...
  ✖ Zone "backend" is already claimed by @alice. They must release it first, or wait for TTL expiry.
```

**TTL refresh (re-claiming your own zone extends the timer):**

```bash
$ ofa claim backend --user alice --ttl 48
```
```text
  🔒 Claiming zone "backend" for @alice...
  ✔ Zone "backend" TTL refreshed for @alice (expires in 48h).
```

---

### `ofa release <zone>` — Release a zone

Unlocks a zone, making it available for others to claim. Includes ownership verification to prevent accidental releases of another developer's zone.

```bash
# Release your claimed zone (uses resolved identity)
ofa release backend

# Release with explicit username
ofa release backend --user alice

# Force-release another user's zone (e.g., if a teammate went offline)
ofa release backend --force

# Release and automatically commit changes
ofa release backend --commit
```

**Refusal when releasing another developer's zone:**

```bash
$ ofa release backend --user bob
```
```text
  ✖ Zone "backend" is owned by @alice, not @bob.
     To force-release, run: ofa release backend --force
```

**Force release example:**

```bash
$ ofa release backend --force
```
```text
  ⚠️  --force specified: bypassing ownership check.

  🔓 Releasing zone "backend"...
  ✔ Zone "backend" force-released (was owned by @alice). It's now available.
  📝 Updating AI config files...
  ✔ All config files updated.
```

**After releasing**, all AI config files are regenerated. AI agents will see the zone as unclaimed and available.

---

### `ofa status` — Show ownership dashboard

Displays the current state of all zones — who owns what, when locks expire, and project rules.

```bash
# Pretty terminal output
ofa status

# JSON output (for scripts, CI, or dashboards)
ofa status --json
```

**Terminal output:**

```text
  ╔══════════════════════════════════════════╗
  ║    🛡️  ONEFORALL — Ownership Status       ║
  ╚══════════════════════════════════════════╝

  Project: my-app (next.js)

  Zone       Owner      Paths                          Status
  ────────── ────────── ────────────────────────────── ──────────
  backend    @alice     src/api/, src/services/         🔴 Claimed
             expires in ~22h
  frontend   @bob       src/components/, src/pages/     🔴 Claimed
             expires in ~20h
  shared     —          src/types/, src/utils/          🟢 Free    🔗
  database   @alice     prisma/                         🔴 Claimed
             expires in ~22h
  infra      —          .github/, docker/               🟢 Free

  Rules:
    • Never modify files outside your claimed zone without approval
    • Shared zone changes require review from all active zone owners
    • Always create a new branch for your work, never push to main directly
    • Run tests before committing
    • Keep commits small and focused on a single task

  Commands: ofa claim <zone>  |  ofa release <zone>  |  ofa guard  |  ofa sync
```

**JSON output (for CI/CD integration):**

```bash
$ ofa status --json
```

```json
{
  "project": { "name": "my-app", "type": "next.js" },
  "zones": [
    {
      "name": "backend",
      "paths": ["src/api/", "src/services/"],
      "owner": "alice",
      "claimed_at": "2026-09-11T07:00:00.000Z",
      "expires_at": "2026-09-12T07:00:00.000Z"
    },
    {
      "name": "frontend",
      "paths": ["src/components/", "src/pages/"],
      "owner": "bob",
      "claimed_at": "2026-09-11T09:00:00.000Z",
      "expires_at": "2026-09-12T09:00:00.000Z"
    }
  ]
}
```

---

### `ofa guard` — Check boundary violations

Validates that your file changes only touch files within zones you own. Use it locally before committing, or in CI to block PRs.

```bash
# Check all uncommitted changes
ofa guard

# Check only staged changes (perfect for pre-commit hooks)
ofa guard --staged

# Strict mode — exit with code 1 on any violation (for CI)
ofa guard --strict
```

**Clean result (all changes within your zone):**

```text
  🛡️  ONEFORALL Guard — Boundary Check
  Checking 3 file(s) for @alice...

  ✅ All changes are within your ownership boundaries. Good to go!
```

**Violation detected (you edited files outside your zone):**

```text
  🛡️  ONEFORALL Guard — Boundary Check
  Checking 5 file(s) for @alice...

  ❌ 2 BOUNDARY VIOLATION(S):

  ✖ src/components/LoginForm.tsx
    File is in zone "frontend" owned by @bob. You (@alice) cannot modify it.

  ✖ src/pages/login.tsx
    File is in zone "frontend" owned by @bob. You (@alice) cannot modify it.

  ⚠️  1 WARNING(S):

  ⚡ src/types/auth.ts
    File is in shared zone "shared" — changes require review from: @alice, @bob
```

**Setting up as a pre-commit hook:**

```bash
# Using git hooks directly
echo '#!/bin/sh\nnpx ofa guard --staged --strict' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or using Husky
npx husky add .husky/pre-commit "npx ofa guard --staged --strict"
```

**In CI (auto-generated by `ofa init`):**

The file `.github/workflows/ofa-guard.yml` is generated automatically and runs on every PR:

```yaml
name: OFA Guard — Ownership Check
on:
  pull_request:
    branches: [main, master, develop]

jobs:
  ownership-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g github:FreakyAdy/ONEFORALL
      - run: ofa guard --strict
```

---

### `ofa sync` — Regenerate all configs

After you manually edit `.ofa/config.yml` (add zones, change paths, update rules), run `ofa sync` to regenerate all AI config files.

```bash
# Sync config files
ofa sync

# Sync and auto-commit to git
ofa sync --commit
```

```text
  🔄 Syncing AI config files from .ofa/config.yml...

  ✔ .github/copilot-instructions.md
  ✔ .cursor/rules/ofa-ownership.mdc
  ✔ GEMINI.md
  ✔ AGENTS.md
  ✔ CLAUDE.md
  ✔ .github/CODEOWNERS
  ✔ .github/workflows/ofa-guard.yml

  ✅ Synced 7 config file(s). All AI agents are up to date!
```

---

### `ofa whoami` — Developer identity

Check or set your persistent GitHub handle for ONEFORALL commands.

```bash
# View current resolved identity and source
ofa whoami

# Set your official GitHub username (saved to .ofa/identity)
ofa whoami --set your-github-handle

# Clear stored identity
ofa whoami --clear
```

**Identity Resolution Order:**
1. Explicit `--user <handle>` flag (highest priority)
2. CI environment variable `OFA_PR_AUTHOR` (in pull request workflows)
3. Stored identity in `.ofa/identity`
4. `git config user.name` (last resort fallback, validated for GitHub handle syntax)

---

### `ofa doctor` — Diagnostic self-check

Run instant diagnostics to verify CLI health, identity resolution, zone configuration, and run a synthetic test of boundary protection.

```bash
ofa doctor
```

```text
  🩺 ONEFORALL Doctor — System Diagnostics
  Running health checks on your setup...

  ✔ [CLI] ONEFORALL v0.1.0 is installed and executable
  ✔ [Identity] Active handle @alice (source: stored)
  ✔ [Config] All 3 zone owners are valid GitHub handles
  ✔ [Engine] Synthetic boundary check and path isolation passed

  ✅ All checks passed! ONEFORALL is fully configured and ready.
```

---

## 🎬 Real-World Walkthrough: Full Team Workflow

Here's a complete, step-by-step example of a 3-person team using ONEFORALL on a Next.js SaaS app.

### The Team

| Person | Role | AI Tool |
| :--- | :--- | :--- |
| **Alice** | Backend engineer | Gemini (Antigravity IDE) |
| **Bob** | Frontend engineer | Cursor |
| **Charlie** | DevOps / infra | GitHub Copilot |

### Step 1: Alice initializes ONEFORALL

Alice clones the repo and runs `ofa init`:

```bash
alice@laptop:~/saas-app$ ofa init
```

The scanner detects the project structure and creates zones:

```
saas-app/
├── src/
│   ├── api/           → detected as "backend" zone
│   ├── services/      → detected as "backend" zone
│   ├── components/    → detected as "frontend" zone
│   ├── pages/         → detected as "frontend" zone
│   ├── types/         → detected as "shared" zone
│   └── utils/         → detected as "shared" zone
├── prisma/            → detected as "database" zone
├── docker/            → detected as "infra" zone
└── .github/           → detected as "infra" zone
```

Alice reviews `.ofa/config.yml` and it looks correct. She commits:

```bash
git add .
git commit -m "chore: initialize ONEFORALL for team collaboration"
git push origin main
```

### Step 2: Everyone claims their zones

```bash
# Alice claims backend + database
alice@laptop:~/saas-app$ ofa claim backend --user alice
alice@laptop:~/saas-app$ ofa claim database --user alice

# Bob pulls the latest, then claims frontend
bob@laptop:~/saas-app$ git pull
bob@laptop:~/saas-app$ ofa claim frontend --user bob

# Charlie claims infra
charlie@laptop:~/saas-app$ git pull
charlie@laptop:~/saas-app$ ofa claim infra --user charlie
```

After each `claim`, the person commits and pushes the updated config files:

```bash
git add .ofa/ GEMINI.md AGENTS.md CLAUDE.md .github/ .cursor/
git commit -m "chore(ofa): claim backend zone"
git push
```

### Step 3: Everyone works with their AI agents

**Alice opens Antigravity IDE.** Gemini automatically reads `GEMINI.md` and sees:

```markdown
### backend — 🔴 Claimed by **@alice**
- Paths: `src/api/`, `src/services/`
- Backend API, services, and business logic

### frontend — 🔴 Claimed by **@bob**
- Paths: `src/components/`, `src/pages/`
- Frontend UI components, pages, and views

## Strict Rules
1. CHECK OWNERSHIP FIRST. Before editing ANY file, identify which zone it belongs to.
2. DO NOT edit files in zones owned by another developer.
```

Alice asks Gemini: *"Add a user authentication endpoint with JWT tokens"*

Gemini creates:
- `src/api/auth.ts` ✅ (in Alice's `backend` zone)
- `src/services/jwt.ts` ✅ (in Alice's `backend` zone)
- `prisma/schema.prisma` ✅ (in Alice's `database` zone)

Gemini does **NOT** touch `src/components/` or `src/pages/` because it read the boundaries.

**Bob opens Cursor.** Cursor loads `.cursor/rules/ofa-ownership.mdc` and sees:

```markdown
- **backend** (@alice): `src/api/`, `src/services/`
  - Backend API, services, and business logic
- **frontend** (@bob): `src/components/`, `src/pages/`
  - Frontend UI components, pages, and views

## Enforcement Rules
1. BEFORE editing any file, determine which zone it belongs to.
2. If the zone has an owner that is NOT you, do NOT edit the file.
```

Bob asks Cursor: *"Build a login page component"*

Cursor creates:
- `src/components/LoginForm.tsx` ✅ (in Bob's `frontend` zone)
- `src/pages/login.tsx` ✅ (in Bob's `frontend` zone)

Cursor does **NOT** touch `src/api/` because it read the boundaries.

### Step 4: Guard catches mistakes

Bob's AI slips and also modifies a shared type file. Before committing, Bob runs:

```bash
bob@laptop:~/saas-app$ ofa guard --staged
```

```text
  🛡️  ONEFORALL Guard — Boundary Check
  Checking 4 file(s) for @bob...

  ⚠️  1 WARNING(S):

  ⚡ src/types/user.ts
    File is in shared zone "shared" — changes require review from: @alice, @bob, @charlie
```

Bob sees the warning and:
- **Option A:** Removes the type changes, asks Alice to add the backend types she needs
- **Option B:** Keeps the change but knows it'll require everyone's review in the PR

### Step 5: CI enforces on every PR

Alice pushes a PR. The auto-generated GitHub Actions workflow runs:

```text
✅ OFA Guard — Ownership Check
   All 7 changed files are within @alice's claimed zones (backend, database).
   No boundary violations detected.
```

Bob pushes a PR that accidentally includes a backend file. CI fails:

```text
❌ OFA Guard — Ownership Check
   BOUNDARY VIOLATION: src/api/routes.ts is in zone "backend" owned by @alice.
   @bob cannot modify files in this zone.
   
   Fix: Remove changes to src/api/routes.ts or coordinate with @alice.
   Exit code: 1
```

The PR is blocked until the violation is resolved.

### Step 6: End of work session — release zones

When Alice is done for the day:

```bash
alice@laptop:~/saas-app$ ofa release backend
alice@laptop:~/saas-app$ ofa release database
```

Or she just lets the TTL expire (default: 24 hours). The lock automatically clears.

---

## 📁 What Gets Generated (and Why)

### `.ofa/config.yml` — The Single Source of Truth

This is the **only file you need to edit manually**. Everything else is generated from it.

```yaml
version: 1
project:
  name: my-saas-app
  type: next.js

zones:
  backend:
    paths:
      - src/api/
      - src/services/
      - src/models/
    owner: alice                    # Currently claimed by alice
    claimed_at: '2026-09-11T07:00:00.000Z'
    description: Backend API and business logic
  frontend:
    paths:
      - src/components/
      - src/pages/
      - src/styles/
    owner: bob
    claimed_at: '2026-09-11T09:00:00.000Z'
    description: Frontend UI components and pages
  shared:
    paths:
      - src/types/
      - src/utils/
    owner: null                     # Not claimed — anyone can work here
    description: Shared types and utilities
    require_all_owners: true        # But PRs need ALL zone owners to review
  database:
    paths:
      - prisma/
    owner: alice
    description: Database schemas and migrations
  infra:
    paths:
      - .github/
      - docker/
    owner: charlie
    description: CI/CD, Docker, and deployment

locks:
  - zone: backend
    owner: alice
    claimed_at: '2026-09-11T07:00:00.000Z'
    expires_at: '2026-09-12T07:00:00.000Z'     # Auto-expires in 24h
    ttl_hours: 24
  - zone: frontend
    owner: bob
    claimed_at: '2026-09-11T09:00:00.000Z'
    expires_at: '2026-09-12T09:00:00.000Z'
    ttl_hours: 24

rules:
  - Never modify files outside your claimed zone without approval
  - Shared zone changes require review from all active zone owners
  - Always create a new branch for your work, never push to main directly
  - Run tests before committing
  - Keep commits small and focused on a single task
```

**Customizing zones:** You can add custom zones, change paths, or add new rules by editing this file directly. Then run `ofa sync` to regenerate all AI configs.

---

### `GEMINI.md` — What Gemini / Antigravity sees

```markdown
# ONEFORALL — AI Collaboration Guidelines

## Project: my-saas-app (next.js)

This project uses **ONEFORALL** for multi-developer AI collaboration.

## Zone Ownership Map

### backend — 🔴 Claimed by **@alice**
- Paths: `src/api/`, `src/services/`, `src/models/`
- Backend API and business logic

### frontend — 🔴 Claimed by **@bob**
- Paths: `src/components/`, `src/pages/`, `src/styles/`
- Frontend UI components and pages

### shared — 🟢 Available *(shared zone — changes need all-owner review)*
- Paths: `src/types/`, `src/utils/`

## Strict Rules
1. CHECK OWNERSHIP FIRST. Before editing ANY file, identify which zone it belongs to.
2. DO NOT edit files in zones owned by another developer.
3. Shared zones require ALL active owners to review before merging.
4. Always use feature branches. Never commit directly to main or master.
5. Run `ofa guard` before committing to verify you haven't crossed boundaries.
```

---

### `.cursor/rules/ofa-ownership.mdc` — What Cursor sees

```markdown
---
description: "ONEFORALL ownership boundaries — DO NOT edit manually, run ofa sync"
globs: ["src/api/**/*", "src/services/**/*", "src/components/**/*", "src/pages/**/*"]
alwaysApply: true
---

# ONEFORALL — Zone Ownership Rules

## Current Ownership
- **backend** (@alice): `src/api/`, `src/services/`
- **frontend** (@bob): `src/components/`, `src/pages/`
- **shared** (UNCLAIMED ⚠️ SHARED ZONE): `src/types/`, `src/utils/`

## Enforcement Rules
1. BEFORE editing any file, determine which zone it belongs to.
2. If the zone has an owner that is NOT you, do NOT edit the file.
3. If the zone is a shared zone, any changes require review from ALL active zone owners.
4. Always work on a feature branch, never commit directly to main.
5. Keep changes minimal and focused — touch only files within your assigned zone.
```

---

### `CLAUDE.md` — What Claude sees

The Claude generator is special: it **appends** to existing content rather than overwriting. If you have Karpathy's AI guidelines (or any other content) in `CLAUDE.md`, it's preserved:

```markdown
# CLAUDE.md

(your existing content stays here untouched)

<!-- OFA:START -->

## ONEFORALL — Zone Ownership (Auto-generated)

| Zone | Owner | Paths | Notes |
|------|-------|-------|-------|
| backend | @alice | src/api/, src/services/ | Backend API and business logic |
| frontend | @bob | src/components/, src/pages/ | Frontend UI components and pages |
| shared | _unclaimed_ | src/types/, src/utils/ | Shared — all owners must review |

### Rules
1. Check zone ownership before editing any file.
2. Do NOT modify files in zones owned by another developer.
3. Shared zones require review from all active zone owners.

<!-- OFA:END -->
```

The `<!-- OFA:START -->` / `<!-- OFA:END -->` markers ensure `ofa sync` can update the section without touching anything else.

---

### `.github/CODEOWNERS` — GitHub PR review enforcement

```text
# CODEOWNERS — Generated by ONEFORALL (ofa)

# Zone: backend — Backend API and business logic
/src/api/       @alice
/src/services/  @alice
/src/models/    @alice

# Zone: frontend — Frontend UI components and pages
/src/components/ @bob
/src/pages/      @bob
/src/styles/     @bob

# Zone: infra — CI/CD, Docker, and deployment
/.github/  @charlie
/docker/   @charlie

# Shared zones — require review from all active owners
# Zone: shared (shared)
/src/types/  @alice @bob @charlie
/src/utils/  @alice @bob @charlie
```

When someone opens a PR touching `src/api/`, GitHub automatically requests review from `@alice`. The PR cannot be merged without her approval (when branch protection rules are enabled).

---

## 🤖 Supported AI Platforms

| Platform | Config File | How It's Used | Status |
| :--- | :--- | :--- | :---: |
| GitHub Copilot | `.github/copilot-instructions.md` | Auto-loaded in Copilot Chat | ✅ |
| Cursor | `.cursor/rules/ofa-ownership.mdc` | Auto-loaded via Cursor Rules (YAML frontmatter) | ✅ |
| Gemini / Antigravity | `GEMINI.md` | Hierarchically loaded from project root | ✅ |
| Claude | `CLAUDE.md` | Appended to existing file with marker comments | ✅ |
| GitHub Copilot Agents | `AGENTS.md` | Read by agentic Copilot workflows | ✅ |
| Windsurf / Codeium | `.windsurfrules` | Coming soon | 🔜 |
| Aider | `.aider.conf.yml` | Coming soon | 🔜 |

---

## ❓ FAQ

### Can I use this with any project type?

**Yes.** ONEFORALL works with any project regardless of language or framework. The scanner auto-detects 15+ project types, but even if it can't detect yours, it creates a default zone and you can customize `.ofa/config.yml` manually.

### What if someone forgets to release their zone?

**TTL auto-expiry.** Every lock has a time-to-live (default: 24 hours). After the TTL expires, the zone automatically becomes available. You can set custom TTLs:

```bash
ofa claim backend --user alice --ttl 48   # 48-hour lock
ofa claim frontend --user bob --ttl 8     # 8-hour lock (short session)
```

### Do I need to commit the generated files?

**Yes.** The generated files (GEMINI.md, CLAUDE.md, etc.) must be committed to git so that other developers' AI agents can read them. After claiming or releasing a zone:

```bash
git add .
git commit -m "chore(ofa): update zone ownership"
git push
```

### What about files that aren't in any zone?

`ofa guard` will issue a **warning** (not an error) for files outside any defined zone. You can add more zones in `.ofa/config.yml` to cover them:

```yaml
zones:
  config:
    paths: [config/, .env.example]
    owner: null
    description: Configuration files
```

### Can two people work in the same zone?

**Not simultaneously.** A zone can only have one owner at a time — that's the point. However, you can:
1. Break a zone into smaller zones (e.g., `backend-auth` and `backend-payments`)
2. Use the `shared` zone pattern with `require_all_owners: true`
3. Take turns — one person claims, works, releases, then the next person claims

### Does this actually prevent AI agents from editing wrong files?

**It depends on the AI agent.** The generated config files are **instructions** that AI agents read as context. Well-behaved agents (Gemini, Cursor, Claude) will respect them in most cases. For the times they don't, `ofa guard` acts as a safety net — catching violations before they reach the repo.

### Can I add custom rules?

**Yes.** Edit the `rules` section in `.ofa/config.yml`:

```yaml
rules:
  - Never modify files outside your claimed zone without approval
  - Use TypeScript strict mode for all new files
  - All API endpoints must have input validation
  - Frontend components must have unit tests
  - Database migrations must be reviewed by 2 people
```

These rules are included in every generated AI config file.

---

## 🧪 Testing & Verification

ONEFORALL comes with a built-in test suite powered by `node:test` (requires Node 18+, zero external testing dependencies):

```bash
# Run all unit and boundary tests
npm test
```

```text
✔ isValidGithubHandle - validates legitimate GitHub handles
✔ isValidGithubHandle - rejects invalid handles
✔ setStoredIdentity / getStoredIdentity / clearStoredIdentity
✔ resolveIdentity - Priority 1: --user flag overrides everything
✔ resolveIdentity - Priority 2: OFA_PR_AUTHOR in CI when no --user flag
✔ resolveIdentity - Priority 3: stored identity when no flag and no CI env
✔ fileInZone - boundary matching prevents prefix overlap (Bug #6)
✔ claimZone - claiming, conflicts, and TTL refresh
✔ releaseZone - ownership verification and force release (Bug #5)
✔ checkBoundaryViolations - enforcement logic
ℹ tests 10 pass 10 fail 0
```

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone and develop locally
git clone https://github.com/FreakyAdy/ONEFORALL.git
cd ONEFORALL
npm install
node bin/ofa.js --help
```

---

## 📝 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built with ❤️ for the AI-augmented development community.

**Stop merging conflicts. Start shipping code.**

</div>
