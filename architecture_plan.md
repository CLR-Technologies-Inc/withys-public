# WWLO PRM — System Architecture & Tech Stack Plan

> A self-hostable personal relationship management journal inspired by [Monica CRM](https://github.com/monicahq/monica), focused on journaling with Markdown-style entries.

> **Last updated:** 2026-05-14 · **Current version:** 0.14.0

---

## 1. Product Summary

WWLO PRM is a personal tool for tracking relationships, interactions, and informal "accounts" between the user and others. Entries follow a structured Markdown format with YAML frontmatter for metadata and tagging.

### Core Views

| # | View | Purpose | Status |
| --- | ------ | --------- | ------ |
| 1 | **Home / Dashboard** | Stats grid, quick actions, "Most Connected" card, recent entries feed | ✅ Done |
| 2 | **Journal View** | Browse entries (card list, calendar, continuous/daily view); search, filter, quick-filter chips | ✅ Done |
| 3 | **Journal Entry** | Create/edit one entry in Markdown format (frontmatter, title, body, tags) | ✅ Done |
| 4 | **People** | Contact directory — multi-field search, relationship filter, health badges, extended profile fields | ✅ Done |
| 5 | **Categories** | Tag/category directory — search, click-through to filtered journal view | ✅ Done |
| 6 | **Trends** | 3-tab analytics — Overview (charts), Health (ranked cards), Sentiment (timeline + distribution) | ✅ Done |
| 7 | **Social Graph** | Force-directed visualization linking contacts through shared tags via **react-force-graph-2d** for web and desktop (Tauri) | ✅ Done |
| 8 | **Settings** | Account, vault config, import/export, sync status | ✅ Done |

### Entry Format (Markdown)

```markdown
---
date: 2025-07-01
contact: John Smith
location: Coffee Shop
type: in-person
from:
to:
with: Sarah, Mike
tags: work, catch-up
subject:
duration: 1 hour
---

# Quick catch-up over coffee

Discussed Q3 plans. He's excited about the new project... #startup
```

- **Frontmatter:** Contains metadata (date, contact, location, type, with, tags, duration, etc.).
- **Title:** The `#` header represents the title.
- **Body:** Markdown body content with optional inline `#hashtags`.
- Future entries (events, meetings) are supported.

---

## 2. Technology Stack

### 2.1 Frontend — Expo (React Native + Expo Router)

| Concern | Choice | Status |
| --------- | -------- | ------ |
| Framework | **Expo SDK 54** with **Expo Router v4** | ✅ Configured |
| Styling | **React Native StyleSheet** (inline styles, design tokens in `constants/Colors.ts`) | ✅ In use |
| State | **Zustand** (local UI state, AsyncStorage hydration) | ✅ In use |
| Data fetching | **TanStack Query v5** (Local store hooks with caching/invalidation) | ✅ In use |
| Markdown parser | **Custom parser** (`lib/markdownParser.ts` — YAML frontmatter) + legacy hledger parser (`lib/parser.ts`) | ✅ In use |
| Charts | **Custom SVG** (bar charts, sentiment timelines via react-native-svg); **Canvas** (social graph via react-force-graph-2d) | ✅ In use |
| AI | **@google/generative-ai** (Gemini — Wingman briefing, voice-to-ledger) | ✅ In use |
| Audio | **expo-audio** (voice recording for voice-to-ledger) | ✅ In use |
| Encryption | **Web Crypto API** — AES-256-GCM vault with PBKDF2 key derivation (`lib/vault.ts`) | ✅ In use |
| Sentiment | **Custom lexicon-based engine** (`lib/sentiment.ts`) with O(1) unified lexicon and multi-word phrase starter optimizations | ✅ In use |

### 2.2 Backend — Local Storage

| Concern | Choice | Status |
| --------- | -------- | ------ |
| Database | **AsyncStorage** (web local storage / mobile persistent files) | ✅ Live |
| Auth | **Simulated Auth** (local user profile session) | ✅ Configured |
| Encryption | **SecureStore** (persistent encryption keys storage on device) | ✅ In use |

### 2.3 Desktop — Tauri v2

Expo web build wrapped in a Tauri v2 shell for a lightweight native desktop app on Windows/macOS/Linux. Tauri uses the system webview (no bundled Chromium), keeping the binary small (~5 MB).

**Status:** ✅ Running — `npm run tauri:dev` is the primary dev workflow.

### 2.4 Email Processing Pipeline

Python-based email ingestion system (`mailprocess/`) that parses `.eml` files. Uses AI models (Gemini) for content classification and summarization, designed for local importation.

**Status:** 🔨 In development — processing pipeline functional, integration with journal entries via `source`/`status` fields.

### 2.5 Self-Hosting

The app is fully client-side and runs completely locally. Self-hosting simply requires building and serving the static frontend from any web server or static host.

**Status:** ✅ Self-hosting ready via static export.

### 2.6 Staging — Render Static Site

A separate static site deployment on [Render](https://render.com) for validating frontend changes before promoting to Vercel production. Both deployments serve static files and operate on browser local storage.

| Aspect | Production (Vercel) | Staging (Render) |
|---|---|---|
| Build | `npx expo export -p web` | `npm install && npx expo export -p web` |
| Config | `vercel.json` | `render.yaml` (Blueprint) |
| Backend | Local Storage | Local Storage |
| PR Previews | Vercel Previews | Render PR Previews |

**Config:** [`render.yaml`](render.yaml) · **Docs:** [`RENDER_STAGING.md`](RENDER_STAGING.md)

---

## 3. Data Model (Local Storage)

WWLO PRM stores database files as JSON-serialized lists in `AsyncStorage`.

### 3.1 Core Client Structures

The core datatypes correspond to the following shapes:

```typescript
export type EntrySource = 'manual' | 'email' | 'sms' | 'telegram' | 'whatsapp' | 'imessage' | 'share';
export type EntryStatus = 'approved' | 'pending' | 'rejected';

export interface SampleEntry {
  id: string;
  entry_date: string;
  contact_name: string;
  location: string;
  raw_text: string;
  tags: string[];
  source: EntrySource;
  status: EntryStatus;
}

export interface SampleContact {
  id: string;
  name: string;
  nickname?: string;
  relationship: string;
  entry_count: number;
  last_entry: string | null;
  emails?: { address: string; tag: string; is_preferred: boolean }[];
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  notes?: string;
  is_self?: boolean;
  targetLevel: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  significant_other?: string;
  significant_other_relationship?: string;
  birthday?: string;
  children?: string;
  pets?: string;
  pet_status?: string;
  how_we_met?: string;
  dietary_preferences?: string;
  relationship_tags?: { category: string; value: string }[];
  is_archived?: boolean;
  preferences?: { category: string; value: string }[];
}
```

### 3.2 Key Design Decisions

- **`raw_text`**: Stores the original Markdown-formatted text as the source of truth.
- **On-the-fly Tag Derivation**: Tags are dynamically computed from entries on startup and updates, avoiding sync tables and preserving integrity.
- **Client-Side Encryption**: Encrypted journal entries are transformed into an opaque ciphertext payload locally via Web Crypto API before saving to storage.
- **Source tracking**: `source` column on entries supports platforms like email, SMS, and WhatsApp imports.
- **Pending review queue**: Imported messages land with `status: 'pending'` and are approved by the user before display in the main journal.

---

## 4. Application Structure

```
prm-journal/
├── app/                          # Expo application
│   ├── app/                      # Expo Router pages
│   │   ├── (auth)/welcome.tsx    # Welcome landing page
│   │   ├── (tabs)/               # Tab navigator
│   │   │   ├── index.tsx         # Home / Dashboard
│   │   │   ├── journal.tsx       # Journal View (list/calendar/continuous)
│   │   │   ├── people.tsx        # People directory
│   │   │   ├── categories.tsx    # Categories/tags directory
│   │   │   ├── trends.tsx        # Analytics (3-tab: Overview/Health/Sentiment)
│   │   │   ├── graph.tsx         # Social network graph (react-force-graph-2d / D3 native fallback)
│   │   │   └── settings.tsx      # Settings & vault
│   │   ├── entry/[id].tsx        # Entry detail view
│   │   ├── person/[id].tsx       # Person detail view
│   │   ├── modal.tsx             # New entry modal
│   │   └── _layout.tsx           # Root layout (auth guard, QueryClient)
│   ├── components/               # Shared components
│   ├── constants/Colors.ts       # Design tokens
│   ├── lib/                      # Core logic
│   │   ├── AuthProvider.tsx      # Simulated local auth context
│   │   ├── gemini.ts             # Gemini AI client
│   │   ├── hooks.ts              # Local Zustand integration hooks
│   │   ├── markdownParser.ts     # YAML frontmatter parser
│   │   ├── parser.ts             # Legacy hledger parser
│   │   ├── sampleData.ts         # Offline/dev sample data types
│   │   ├── sentiment.ts          # Sentiment analysis engine
│   │   ├── store.ts              # Zustand state store (AsyncStorage backed)
│   │   └── vault.ts              # E2E encryption (AES-256-GCM)
│   └── src-tauri/                # Tauri v2 desktop wrapper
├── mailprocess/                  # Email ingestion pipeline (Python)
│   ├── process_emails.py         # Main processing script
│   ├── diagnose_gemma4.py        # AI model diagnostics
│   └── requirements.txt          # Python dependencies
├── scripts/                      # Utility & benchmark scripts
├── architecture_plan.md          # This file
├── changelog.md                  # Version history
├── design.md                     # Design system tokens
└── template_entry.md             # Entry format reference
```

---

## 5. Status & Cross-References

| Document | Purpose |
|----------|---------|
| [changelog.md](changelog.md) | Version history (0.1.0 → 0.14.0) — completed work per release |
| [design.md](design.md) | Visual design system — colors, typography, component specs |
| [mission.md](mission.md) | Product vision, goals, and user research notes |
| [agents.md](agents.md) | CI/CD and engineering standards |
| [template_entry.md](template_entry.md) | Entry format reference with examples |

### Agent Configuration

| Agent | Config File | Responsibility |
|-------|-------------|----------------|
| **Gemini** | `.gemini/gemini.md`, `GEMINI.md` (user rule) | State store, parser, local security |
| **Jules** | `.jules/sentinel.md` | Security sentinel (vulnerability notes) |
