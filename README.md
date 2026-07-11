# WITHYS PRM — Where We Left Off (WWLO)

A self-hostable personal relationship management journal inspired by [Monica CRM](https://github.com/monicahq/monica), focused on journaling with Markdown-style entries. See [mission.md](mission.md) for the full product vision.

> **Current version: 0.14.0** — See [changelog.md](changelog.md) for release history.

## Why WWLO?

1. Reconnect with old friends and remember what you talked about last time
2. Have context when making new friends
3. Set meaningful goals and intentions for new relationships

Free to host (open source). $5 one-time, then pay for relative usage (+30%).

## Architecture

| Layer | Technology | Status |
|-------|-----------|--------|
| **Frontend** | Expo SDK 54 (React Native) + Expo Router v4 | ✅ |
| **Backend** | Local Storage (AsyncStorage / SecureStore) | ✅ |
| **Desktop** | Tauri v2 | ✅ |
| **State** | Zustand + TanStack Query v5 | ✅ |
| **AI** | Gemini, Cerebras, xAI, OpenAI (local-key-only) | ✅ |
| **Encryption** | AES-256-GCM via Web Crypto API | ✅ |
| **Email Pipeline** | Python `.eml` parser + AI classification | 🔨 |

See [architecture_plan.md](architecture_plan.md) for schema, directory tree, and tech-stack details.

## Project Structure

```
prm-journal/
├── app/                    # Expo application (React Native)
│   ├── app/                # Expo Router pages (tabs, modals, detail views)
│   ├── components/         # Shared UI components
│   ├── constants/          # Design tokens
│   ├── lib/                # Core logic (parser, hooks, vault, sentiment, AI)
│   └── src-tauri/          # Tauri v2 desktop wrapper
├── mailprocess/            # Email ingestion pipeline (Python)
├── scripts/                # Utility & benchmark scripts
└── ref/                    # Test personas & reference materials
```

## Documentation Map

Each document has a single responsibility — no duplication across files.

| Document | Singleton Role |
|----------|----------------|
| [architecture_plan.md](architecture_plan.md) | Tech stack, schema, directory tree — **how the system is built** |
| [design.md](design.md) | Colors, typography, component specs — **how the UI looks** |
| [GitHub Issues](https://github.com/CLRTechDev/prm-journal/issues) | Feature backlog & active work — **what to build next** |
| [changelog.md](changelog.md) | Version history (0.1.0 → 0.14.0) — **what was built** |
| [mission.md](mission.md) | Product vision, goals, user research — **why we build** *(PM-owned, read-only for agents)* |
| [agents.md](agents.md) | CI/CD & engineering standards — **how we work** |
| [template_entry.md](template_entry.md) | Entry format reference — **how entries are structured** |

## Project Tracking

All work is tracked via [GitHub Issues](https://github.com/CLRTechDev/prm-journal/issues) with priority labels and milestones.

| Milestone | Focus | Priority |
|-----------|-------|----------|
| [v0.13 — People & UX](https://github.com/CLRTechDev/prm-journal/milestone/1) | People page features, onboarding, quick entry | P2 |
| [v0.14 — Platform Hardening](https://github.com/CLRTechDev/prm-journal/milestone/2) | PWA cache busting, version drift, responsive fixes | P1–P2 |
| [v1.0 — Production Ready](https://github.com/CLRTechDev/prm-journal/milestone/3) | Security audit, E2E encryption, auth hardening | P2 |
| [Backlog](https://github.com/CLRTechDev/prm-journal/milestone/4) | Polish, future vision, exploratory | P3–P4 |

**Labels:** `P1-critical` · `P2-high` · `P3-medium` · `P4-low` · `area/*` (people, journal, pwa, backend, ux, security, google, desktop, import-export, ai) · `type/*` (bug, feature, enhancement, audit)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Rust toolchain (for Tauri desktop builds)

### Development

```bash
cd app
npm install
npm run tauri:dev    # Desktop (Tauri + Expo Web)
npm run web          # Web only
```

### Environment

Copy `.env.example` to `.env` and configure your API keys if you wish to use optional AI features:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key  # Optional, for AI features
```

## Entry Format

```markdown
---
date: 2025-07-01
contact: John Smith
location: Coffee Shop
type: in-person
tags: work, catch-up
---

# Quick catch-up over coffee

Discussed Q3 plans. He's excited about the new project.
```

See [template_entry.md](template_entry.md) for full format documentation.

## License

Open source — free to self-host.
