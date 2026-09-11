<div align="center">

# 🚀 `ofa`
### Universal AI Collaboration Tool for GitHub Teams

**Let multiple developers and their AI agents work on the same repo without merge conflicts.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![npm](https://img.shields.io/badge/npm-oneforall--ai-red.svg)](https://www.npmjs.com/package/oneforall-ai)
[![Contributing Guide](https://img.shields.io/badge/contributing-guide-blue.svg)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#-quick-start)

<p align="center">
  <a href="#-quick-demo">Quick Demo</a> •
  <a href="#-why-oneforall">Why ONEFORALL</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-commands">Commands</a> •
  <a href="#-supported-ai-platforms">Platforms</a> •
  <a href="#-how-it-works">How It Works</a>
</p>

</div>

---

## ⚡ Quick Demo

Initializing a project, claiming zones, and checking boundaries:

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

## 💡 Why ONEFORALL?

When 2+ developers use AI coding agents (**Cursor, Copilot, Gemini, Claude**) on the same repo, predictable failures emerge:

* **AI agents don't know about each other** — Agent A edits `auth.ts` while Agent B refactors the same file simultaneously
* **No ownership boundaries** — nothing stops two AI agents from touching the same code paths
* **Merge conflicts discovered too late** — after hours of AI-generated work, not before
* **No shared context across platforms** — Cursor can't see what Copilot is doing, Gemini has no idea about Claude's boundaries

**`ofa` provides a practical CLI tool and CI scanner to enforce zone-based ownership, generate cross-platform AI instructions, and prevent conflicts before they happen.**

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

### Generated Files (one command → all platforms)

| Generated File | Target AI Platform | Purpose |
| :--- | :--- | :--- |
| `.ofa/config.yml` | All | Single source of truth — zones, locks, rules |
| `.github/copilot-instructions.md` | GitHub Copilot | Copilot Chat & Agent context |
| `.cursor/rules/ofa-ownership.mdc` | Cursor | Cursor Rules with YAML frontmatter |
| `GEMINI.md` | Gemini / Antigravity | Gemini CLI & IDE context |
| `AGENTS.md` | GitHub Copilot Agents | Agentic workflow context |
| `CLAUDE.md` | Claude | Appended (preserves existing content) |
| `.github/CODEOWNERS` | GitHub | PR review enforcement per zone |
| `.github/workflows/ofa-guard.yml` | GitHub Actions | CI boundary violation check |

---

## 🚀 Quick Start

### Installation

```bash
# Install globally via npm
npm install -g oneforall-ai

# Or use directly with npx
npx oneforall-ai init
```

### Usage

```bash
# 1. Navigate to your project
cd your-project

# 2. Initialize — scans structure, generates all configs
ofa init

# 3. Claim your zone
ofa claim backend --user your-github-username

# 4. Check who owns what
ofa status

# 5. Verify boundaries before committing
ofa guard

# 6. Regenerate configs after manual edits
ofa sync
```

---

## 📋 Commands

| Command | Description |
| :--- | :--- |
| `ofa init [--yes] [--force]` | Scan project, detect zones, generate all AI configs and CI workflow |
| `ofa claim <zone> --user <name> [--ttl <hours>]` | Claim ownership of a zone with optional TTL (default: 24h) |
| `ofa release <zone>` | Release a previously claimed zone |
| `ofa status [--json]` | Show current ownership dashboard (or JSON for CI) |
| `ofa guard [--staged] [--strict] [--pr <n>]` | Check changes respect boundaries — pre-commit hook or CI |
| `ofa sync` | Regenerate all AI config files from `.ofa/config.yml` |

---

## 🤖 Supported AI Platforms

| Platform | Config File | Status |
| :--- | :--- | :---: |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ |
| Cursor | `.cursor/rules/ofa-ownership.mdc` | ✅ |
| Gemini / Antigravity | `GEMINI.md` | ✅ |
| Claude | `CLAUDE.md` | ✅ |
| GitHub Copilot Agents | `AGENTS.md` | ✅ |
| Windsurf / Codeium | — | 🔜 |
| Aider | — | 🔜 |

---

## ⚙️ How It Works

### 1. Zones

Your project is divided into **zones** — logical areas like `backend/`, `frontend/`, `shared/`. The scanner auto-detects zones from your directory structure, recognizing **15+ project types** and **8 zone categories** (backend, frontend, shared, database, infra, docs, mobile, tests).

### 2. Claiming

A developer **claims** a zone with `ofa claim`. This:
- Locks the zone (with configurable TTL auto-expiry — no deadlocks)
- Regenerates all AI config files so **every platform** knows the boundaries
- Updates CODEOWNERS for GitHub PR review enforcement

### 3. Guarding

`ofa guard` validates that your changes only touch files within your claimed zone:
- **Locally** — as a `pre-commit` hook via `ofa guard --staged`
- **In CI** — via the auto-generated GitHub Actions workflow on every PR
- **Strict mode** — `ofa guard --strict` exits with code 1 on any violation

### 4. Syncing

When team composition changes or you manually edit `.ofa/config.yml`, run `ofa sync` to regenerate all platform configs from the single source of truth.

---

## 📄 Example `.ofa/config.yml`

```yaml
version: 1
project:
  name: my-app
  type: fullstack

zones:
  backend:
    paths: [src/api/, src/services/, src/models/]
    owner: alice
    description: Backend API and business logic
  frontend:
    paths: [src/components/, src/pages/, src/styles/]
    owner: bob
    description: Frontend UI components and pages
  shared:
    paths: [src/types/, src/utils/]
    owner: null
    description: Shared code — requires all owners to review
    require_all_owners: true

rules:
  - Never modify files outside your claimed zone
  - Shared zone changes require all-owner review
  - Always use feature branches
  - Run tests before committing
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
