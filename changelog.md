# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_See [GitHub Issues](https://github.com/CLRTechDev/prm-journal/issues) for active work items._

## [0.14.0] — 2026-05-14

### Added
- **Vault Restore on Reinstall** — Detect existing encrypted entries in Supabase after PWA reinstall and prompt "Restore Vault" instead of "Set Up New Vault." Validates passphrase by decrypting a real cloud entry (#80).
- **PII Liability Disclaimers (Terms of Service)** — Added §11.3 Sensitive Data, §11.4 Third-Party Information, and §11.5 Prohibited Uses to shield CLR Technologies from liability when users input regulated data (SSNs, health info, financial data).
- **Privacy Policy Data Responsibility** — Added §2.1 User-Generated Content About Third Parties and §2.2 Sensitive Categories clarifying the user's role as sole data controller.
- **Help: Your Data Responsibility** — New help section in About page warning users against storing sensitive PII in plain text and reinforcing Vault usage.
- **Help: Vault Sentiment Limitation** — Added note that sentiment analysis, AI features, and search cannot process encrypted vault entries.
- **GitHub Issues #75–#79** — Filed feature requests for Multi-Identity Auth, Clickable Contact Links, AI Rewrite Buttons, Auto-Location Bug, and AI Walkthrough Guide.

### Changed
- **Vault Store** — Added `vaultRestorable` state flag and `restoreVault()` action to Zustand store. Enhanced `hydrateVault()` to query cloud for orphaned encrypted entries.
- **Vault Storage** — Added `checkCloudVaultEntries()` and `fetchOneVaultEntry()` to `vaultStorage.ts` for lightweight cloud vault detection.
- **Settings Vault UI** — Three-mode vault modal (Setup / Unlock / Restore) with amber-tinted restore card and cloud-download iconography.

## [0.13.0] — 2026-05-14

### Added
- **Service Layer Architecture** — Decouple Zustand store from Supabase persistence via `entryService.ts` and `contactService.ts` for cleaner offline-first operation.
- **Version Banner & Update Checks** — New `VersionBanner` component and `versionCheck.ts` module that poll `/api/version.json` and surface a non-blocking update notification when a new PWA version is available.
- **Bulk Delete Contacts** — Long-press to enter bulk selection mode on the People directory with multi-select and batch delete with confirmation dialog.
- **Quick Log Modal** — Inline "Quick Log" form on Person detail pages for fast, in-context journal entry creation without leaving the contact view.
- **Wants / Needs / Nice-to-Have** — Inline quick-add form on Person detail pages with category picker (`want`, `need`, `nice-to-have`) and chip display for saved preferences.
- **Onboarding Banner** — Dismissible "Set up your profile" banner on the Journal page prompting new users to create a "Me" contact.
- **Template Overwrite Confirmation** — `ConfirmDialog` gate on the entry modal so applying a template warns when content is already present.
- **GitHub Project Tracking** — Added issue templates (bug report, feature request), PR template, `CONTRIBUTING.md`, and milestones-based project tracking via GitHub Issues replacing `improvements.md`.
- **PWA Safe-Area & Responsive Fixes** — Full `env(safe-area-inset-*)` support, `100dvh` viewport, `overflow: hidden` on root to eliminate iOS scroll bounce, and iOS tap highlight suppression.
- **Service Worker Update Flow** — Enhanced SW lifecycle: `updatefound` detection, `controllerchange` listener, and `sw-update-available` custom events enabling the Version Banner.
- **Vercel Deployment Config** — Added `vercel.json` with explicit `buildCommand`, `outputDirectory`, and cache-control headers via `_headers` file.
- **URL Security** — New `urlUtils.ts` with `openSafeExternalURL()` that sanitizes `tel:`, `mailto:`, `https:` URIs against XSS/protocol attacks, with unit tests.

### Changed
- **Store Simplification** — Removed all inline Supabase sync calls from Zustand CRUD actions; store is now purely local state with service-layer persistence handled via TanStack Query hooks.
- **People Empty State** — Upgraded to shared `EmptyState` component with "Add Contact" CTA.
- **People Directory Pagination** — Configurable items-per-page (10/25) with page controls.
- **Journal Empty State** — Context-aware empty states: shows "Clear All Filters" when filters are active, "New Entry" when journal is empty.
- **Graph Rendering** — Architecture plan updated to reflect `react-force-graph-2d` (Canvas) on web with D3/SVG native fallback.
- **PWA Manifest** — `shortName` updated from "PRM" to "WWLO PRM".
- **Simple/Advanced Mode** — Marked as completed in backlog.

### Security
- **URI Sanitization** — Phone call handler on Person detail page now strips non-phone characters and routes through `openSafeExternalURL()` instead of raw `Linking.openURL()`.
- **Secure Search Path** — New migration `20260514000000_secure_search_path.sql` restricting Postgres search path.

## [0.12.1] — 2026-05-13

### Added
- **Testing Framework** — Added Autonoma-style natural language regression test scenarios via `.agents/tests/scenarios` folder.

### Changed
- **Regression Skill** — Transitioned `regression` skill to execute automated natural language test files using the autonomous browser subagent instead of hardcoded script execution.
- **Git Config** — Updated `.gitignore` to track agent `.agents/tests/` and `.agents/skills/` directories.


## [0.12.0] — 2026-05-11

### Added
- **Privacy Policy** — Add dedicated Privacy Policy screen with CLR Technologies legal copy, accessible from welcome, login, and settings pages.
- **Version Badge** — Add build-time version badge to the welcome page footer, reading directly from `app.json` via Metro import.
- **Vercel Security Headers** — Add `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers to all routes.
- **ESLint Config** — Add `eslint.config.js` for project-wide linting standards.

### Changed
- **Graph Screen** — Replace custom D3/SVG force simulation with `react-force-graph-2d` for dramatically improved performance, eliminating UI thread blocking during physics calculations.
- **Trends Screen** — Wrap all derived computations (people frequency, tag frequency, monthly activity, health stats) in `useMemo` hooks to prevent redundant recalculation on tab navigation.
- **Login Screen** — Replace all hardcoded colors with reactive design system tokens from `useColors()`, ensuring light/dark theme consistency.
- **Welcome Footer** — Expand with version pill badge and separate Terms & Privacy links.
- **Version Tracking** — Convert `about.tsx`, `settings.tsx`, and `welcome.tsx` to import version from `app.json` at build time, eliminating manual version string drift.
- **Version Skill** — Expand manifest table, add staleness-detection grep step, auto-proceed on bump recommendation.

### Fixed
- **About Screen** — Fix stale version string (`v0.11.4` → dynamic `appJson.expo.version`).
- **Store** — Fix null safety bug in `last_entry` comparison when adding entries to contacts with no prior entries.
- **Person Detail** — Fix TypeScript style typing on danger zone delete button.

### Security
- **Session Storage** — Move Supabase session tokens from plaintext `AsyncStorage` to `expo-secure-store` on native platforms (Keychain/Keystore), with `AsyncStorage` fallback on web only.
- **Accessibility** — Add `accessibilityRole` and `accessibilityLabel` to all icon-only buttons across Journal, People, and Settings screens.

## [0.11.5] — 2026-05-11

### Changed
- **Person Profile** — Moved the Preferences (Wants / Needs / Nice-to-Have) section above the Sentiment section for better visibility.

### Fixed
- **Auth** — Tested Beatriz Restrepo sign-in flow via Vercel to confirm that the auth callback redirection issues persist.

## [0.11.4] — 2026-05-11

### Fixed
- **Vercel Routing** — Added `vercel.json` to properly configure `cleanUrls: true` for the static web output, fixing 404 errors when navigating to the `/auth/callback` route during Google OAuth sign-in.

## [0.11.3] — 2026-05-11

### Fixed
- **OAuth Callback Routing** — Fixed a 404 error during Google login by correctly configuring the OAuth callback to route through `/auth/callback` in the Expo app and updating `redirectTo` URLs.
- **Theme UI Consistency** — Updated Relationship Health styles on the People and Home screens to correctly apply the active theme's colors (`healthScoreColor` and `sentimentColor`), fixing contrast issues in light mode.

## [0.11.2] — 2026-05-11

### Changed
- **Person Profile** — Moved the Preferences (Wants / Needs / Nice-to-Have) section above the Sentiment section for better visibility.
- **Theme Support** — Refined the Relationship Health status and Sentiment bar coloring for improved legibility and contrast in light mode.

### Fixed
- **Google OAuth** — Fixed a 404 redirect error during the web-based sign-in flow by setting the callback route to the root path (`/`).

## [0.11.1] — 2026-05-11

### Changed
- **Profile** — Moved the Account Deletion feature out of Settings and into the Profile page.
- **Journal & People Layout** — Improved wrapper responsiveness and scrolling for non-mobile views.

### Fixed
- **OAuth Redirect** — Updated testing mocks to reflect the new `/callback` OAuth redirect path.

## [0.11.0] — 2026-05-11

### Added
- **Top Navigation** — Added a theme toggle (light/dark mode) icon next to the feedback button.

### Changed
- **Mappers** — Added missing mapper utility functions (`buildTagsByEntryMap`, `buildContactStatsMap`, `buildTagCountsMap`) to support reactive tag aggregation in the data layer.

### Fixed
- **Jest Tests** — Corrected `transformIgnorePatterns` configuration to properly support pnpm module path resolution.
- **Entry Detail** — Fixed `canSave` scope access and converted `handleSave` to an async function to prevent race conditions during encrypted save operations.

## [0.10.0] — 2026-05-11

### Added

- **Welcome & Onboarding** — Branded landing page with animated hero, feature cards, "Get Started" CTA, and Terms & Conditions link. New onboarding flow for first-time users.
- **Theme System** — Full dark/light/system theme switching via `ThemeProvider`. Settings includes theme cycle toggle. Colors adapt across all screens.
- **PWA Support** — Web manifest, service worker, share target handler (`/share-target`), custom `+html.tsx` root, and `usePWAInstall` hook for app install prompts on mobile and desktop.
- **Dashboard Effort Meter** — Monthly effort tracking card on the Home/Dashboard page comparing estimated monthly interactions (based on contact target levels) against actual entries logged this month. Progress bar with color-coded status (green/amber/red).
- **Simple/Advanced Mode** — Toggle in Settings → Appearance that hides Categories, Trends, and Graph tabs in simple mode. Home tab renames to "Dashboard" in advanced mode.
- **Responsive Layout System** — `useResponsive` hook with mobile/tablet/desktop breakpoints. `PageContainer` wrapper component with responsive `maxWidth` and padding applied across all tab screens.
- **Usage Report Page** — Dedicated `/usage` route with detailed billing projection breakdown (base fee, per-entry cost, per-contact cost, margin).
- **Billing Page** — Dedicated `/billing` route for subscription management (placeholder during beta).
- **About Page Routes** — `/about` and `/billing` registered in root Stack navigator.
- **Login Tests** — Unit test suite for the login screen.
- **Database Migrations** — `add_relationship_tags` and `add_is_archived_to_contacts` migrations.
- **Agent Credential Policy** — "Never fabricate credentials" rule added to `gemini.md`. Regression skill updated to mandate reading credentials from `.env.test`.

### Changed

- **Import/Export Terminology** — Replaced all "hledger" references with "Markdown" to accurately reflect the YAML frontmatter parsing format.
- **Graph Pan & Zoom** — Rebuilt graph interaction with PanResponder and SVG viewBox manipulation. Added +/−/reset zoom controls.
- **Settings Reorganization** — Consolidated sections: Account, Vault, Data, Offline Mode, Google Integration, Appearance, App, AI Features, Billing & Usage, About. Moved billing details to dedicated page.
- **Tab Naming** — Home tab dynamically renames to "Dashboard" when simple mode is disabled.
- **Google OAuth** — Rearchitected auth flow with improved token handling and callback route.
- **Colors Palette** — Expanded with syntax highlighting tokens, gradient supports, and additional semantic colors.
- **Store** — Added `simpleMode` state with `AsyncStorage` persistence.
- **Trends** — Responsive layout with clickable sentiment filter buttons.
- **People** — Responsive card layout and improved filter UX.

### Fixed

- **Onboarding Routing** — "Start Journaling" button now correctly navigates to the main app (race condition with auth state resolved).
- **Graph Scrollability** — Social network graph was not scrollable; now supports pan/drag and scroll-to-zoom.
- **Version Display** — Settings version display updated from hardcoded to match `app.json`.

### Security

- **Credential Hygiene** — Agents must never fabricate test credentials. All smoke/regression test credentials sourced exclusively from `.env.test`.

## [0.9.0] — 2026-05-10

### Added

- **Local Whisper Voice Pipeline** — Local speech-to-text server (`scripts/whisper-server.py`) using faster-whisper with OpenAI-compatible `/v1/audio/transcriptions` endpoint. Frontend client (`lib/whisper.ts`) with two-stage voice→markdown pipeline (Whisper → Ollama/Gemma). Auto-detects available providers (local, Gemini, none).
- **Network Capacity Dashboard** — Profile page now shows network health: yearly interaction forecast, daily time commitment estimate, and capacity status (Balanced / Over / Under committed). Includes network goal selector (Grow / Maintain / Trim) persisted to the contact's relationship field.
- **Status Pills** — Replaced the single "Synced" badge with a compact row of status pills showing Sync (green), Vault state (amber when open, grey when locked), and AI enabled (blue). Each pill only appears when relevant.
- **Mission Statement** — New `mission.md` tracking the product vision and design goals. PM-owned, read-only for agents.
- **Wants/Needs/NTH Backlog** — Added backlog item for key-value tag system on Person detail page (`Needs: stability`, `Wants: kids`, `NTH: live on the beach`).

### Changed

- **Documentation Consolidation** — Deduplicated `changelog.md`, `improvements.md`, `architecture_plan.md`, and `design.md` into singleton documents with clear ownership. Removed duplicate "Completed Improvements" from improvements.md, duplicate "Planned" from changelog, and duplicate Feature Status/Development Phases from architecture. Each file now has a single responsibility documented in the README.
- **README** — Rewritten with documentation map table, WWLO branding, architecture summary table, and updated project structure reflecting Google Suite and local AI directories.

### Fixed

- **Category→Journal Navigation** — Clicking a category tag now correctly populates the Journal search bar via the Zustand store. Previously, `router.push` with params was not consumed because `useLocalSearchParams` was never called. Changed to store-based state passing with `router.navigate` for reliable tab switching.
- **Duplicate `useContacts`** — Removed duplicate `const { data: contacts } = useContacts()` declaration in `entry/[id].tsx` that caused a TypeScript error.

## [0.8.0] — 2026-05-10

### Added

- **Google Suite Integration** — Full OAuth2 auth library (`lib/google/auth.ts`) with authorization code flow, token exchange, refresh, and revocation. Google Contacts sync engine with 4-step deduplication (resource ID → email → phone → name). Gmail sync engine (90-day initial + History API incremental, metadata-only cache). Google Calendar sync engine with attendee-to-contact matching and auto-draft journal entries for completed meetings.
- **Google Integration Migration** — New `google_sync_state`, `google_email_cache`, and `google_calendar_cache` tables with RLS policies. Extended `contact_identities` with `google_resource_name`.
- **Cerebras AI Backend** — New `CerebrasClient` in `scripts/ai-client.mjs` (OpenAI-compatible `/v1/chat/completions` endpoint). Frontend `lib/cerebras.ts` with `chatCompletion()`, `generateBriefing()`, `parseTranscriptToMarkdown()`, `summarizeEmailToEntry()`, and health check utilities.
- **API Key Management UI** — Settings page expands when AI is toggled on to show per-provider API key inputs (Gemini, Cerebras, xAI, OpenAI) with masked display, save/clear actions, status badges, and local-only persistence.
- **About Page** — New help and getting started page (`about.tsx`) accessible from Settings.
- **Journal Hover Descriptions** — Tooltip descriptions on Journal page tiles and entry cards.
- **Encryption Display Mirroring** — Vault encryption indicator formatting now consistent across Journal detail, day-by-day entry, and Personal Journal views.
- **Social Graph Improvements** — Thicker, brighter edges in dark mode. Fixed duplicate contacts caused by bracket-wrapped names (Rosa Delgado, Fernando Castillo, Jorge Restrepo, Raul Vargas).
- **Nickname Field** — New `nickname` column on contacts via migration `20260510032106`.
- **Test Data Scripts** — `scripts/seed-test-data.mjs` and `scripts/bea-test-data.mjs` for smoke testing with the Robin Tester account.
- **Persona Reference** — `ref/Persona_Beatriz_Restrepo.md` test persona for development.

### Changed

- **AI Provider Switch** — `AI_PROVIDER` env var now supports `cerebras` alongside `ollama` and `gemini`. Seed pipeline accepts `--cerebras` CLI flag.
- **Settings AI Section** — Toggle subtitle dynamically shows "Yes · N keys configured" count. Panel expands with privacy notice: "Keys are stored locally on this device."
- **Entry Detail Page** — Encryption indicators and vault lock icons standardized across all entry views.
- **Person Detail Page** — Encryption display for contact notes mirrored from journal entry formatting.
- **Home Dashboard** — Updated interaction tiles with hover tooltips.
- **Architecture Plan** — Updated to 9 migrations, added `lib/google/` directory tree, marked Google Suite integration as in-progress.

### Fixed

- **Gemini Test** — Updated `gemini.test.ts` assertion to match refactored error message from `getGeminiKey()`.
- **Social Graph Edges** — Increased stroke width and opacity for better visibility in dark mode.
- **Contact Dedup** — Removed leading/trailing brackets from imported contact names that caused phantom duplicates.

## [0.7.0] — 2026-05-10

### Added

- **Vault State Persistence** — Vault passphrase hash survives app restarts via `vaultStorage.ts` (SecureStore on mobile, AsyncStorage on web). Vault hydrates on launch and starts locked.
- **Vault Reset** — New "Reset Vault" action in settings with confirmation dialog. Clears stored hash and unlocks vault configuration for re-setup.
- **Profile Screen** — Dedicated user profile page (`profile.tsx`) accessible from settings.
- **Change Password Screen** — Standalone screen for updating Supabase auth credentials with validation.
- **Billing & Subscription Page** — Stub billing page showing beta plan status and feature list.
- **Delete Account** — Account deletion flow in settings with platform-aware confirmation (Alert on native, confirm on web).
- **Extended Contact Fields** — Contact model now supports `significant_other`, `birthday`, `children`, `pets`, `pet_status`, `how_we_met`, and `dietary_preferences` in both the UI and Supabase insert path.
- **Version Skill** — New `.agents/skills/version/SKILL.md` automating the full release workflow: changelog generation, version bumping, lint cleanup, context updates, commit, tag, and push.

### Changed

- **Default Target Level** — New contacts default to `annually` instead of `monthly` for less aggressive interaction reminders.
- **Supabase Client** — Graceful fallback for missing environment variables instead of hard crash.
- **Tab Bar** — Adjusted tab bar height and padding for better bottom-safe-area handling.
- **Settings Navigation** — Profile, Change Password, and Billing links are now functional router pushes instead of static rows.

### Fixed

- **TypeScript** — Resolved 27 type errors: duplicate `'distant'` key in sentiment lexicon, missing `surfaceInput` color token, incomplete `insertContact` payload, and missing fields on `isNew` contact default.
- **Trends Tab** — Fixed import path for sentiment module.

## [0.6.0] — 2026-05-09

### Added

- **AI Wingman Briefing** — Gemini-powered 3-bullet meeting prep on person detail page. Opt-in only, fires on user click.
- **Journal Quick Filters** — Horizontal scrollable filter chips for locations, tags, and entry sources. Includes "Clear All" button.
- **Messaging Integration Schema** — Database migration adding `source`, `source_message_id`, and `status` columns to `journal_entries` for multi-platform entry tracking.
- **Pending Review Queue** — Imported messages land as `status: 'pending'` and are hidden from the main journal until approved.
- **Contact Identities Table** — `contact_identities` table for cross-platform deduplication (telegram, whatsapp, instagram, twitter, linkedin, imessage, signal). Includes RLS policies and auto-seeding from existing emails/phones.
- **Source Deduplication** — Unique index on `(user_id, source, source_message_id)` prevents re-importing the same message.

### Fixed

- Migrated orphaned `parseEntry` call in `person/[id].tsx` to `parseMarkdownEntry`.
- Fixed Jules `journal.tsx` syntax error (duplicate filter line) before integrating quick-filter feature.

## [0.5.0] — 2026-05-09

### Added

- **Social Network Graph** — Force-directed d3 visualization linking contacts through shared tags. Interactive nodes navigate to person detail.
- **Voice-to-Ledger** — Gemini AI-powered audio recording → hledger text transcription in the new-entry modal.
- **App identity** — Configured `app.json` with proper name, slug, scheme, dark splash, iOS `bundleIdentifier`, and Android `package`.
- **Dev script** — Added `npm run dev` to `package.json`.

### Fixed

- Resolved all TypeScript type errors (expo-router typed routes, Web Crypto `BufferSource`, `expo-file-system` enum, jest globals).
- Fixed `react-native-svg` module resolution (SDK version mismatch).
- Removed unused Expo template boilerplate (`Themed.tsx`, `EditScreenInfo.tsx`, `StyledText.tsx`).

## [0.4.0] — 2026-05-08

### Added

- **Sentiment & Relationship Health Engine** (`lib/sentiment.ts`) — Lexicon-based sentiment scoring with negation detection and intensifier handling.
- **Composite health score** — Weighted formula combining recency, frequency, sentiment, and consistency metrics per contact.
- **Target interaction levels** — Per-contact configurable targets (daily, weekly, biweekly, monthly, quarterly) with overdue tracking.
- **Trends dashboard: 3-tab layout** — Overview (existing charts), Health (ranked health cards), Sentiment (timeline + distribution).
- **Health indicators on People list** — Color-coded health badges (Thriving/Healthy/Needs Attention/At Risk/Critical).
- **Sentiment timeline on Person detail** — Per-entry sentiment scores charted over time.

## [0.3.0] — 2026-05-08

### Added

- **E2E Encrypted Vault** (`lib/vault.ts`) — AES-256-GCM encryption via Web Crypto API with PBKDF2 key derivation (100k iterations).
- **Per-entry encrypt/decrypt** — Each vault entry uses a unique salt + IV; ciphertext stored as base64 blob.
- **Vault setup/unlock UI** — Passphrase configuration and session-based unlock in Settings tab.
- **Lock indicators** — Vault entries show lock icons in journal list and entry detail views.
- **Vault tag** — `; vault:true` tag automatically applied to encrypted entries.

## [0.2.0] — 2025-05-08

### Added

- **Dashboard / Home tab** — stats grid (total entries, people, streak, monthly count), quick actions (New Entry, Browse), "Most Connected" highlight card, recent entries feed.
- **Journal View: Calendar mode** — monthly grid with day/entry indicators, click-to-filter by date.
- **Journal View: Continuous mode** — timeline-based day-grouped view with vertical connector lines.
- **Journal View: Month picker** — horizontal chip scroll to filter by month with clear button.
- **Journal View: View toggle** — list/calendar/continuous icon toggle in the filter bar.
- **People: Relationship filter** — horizontal filter chips (All, Friend, Family, Colleague, Professional, Acquaintance).
- **People: Multi-field search** — search by name, email, city, or company.
- **People: Contact detail pills** — company and city shown on each contact card.
- **Person Detail: Edit form** — full edit form for name, relationship, email, phone, company, city, notes.
- **Person Detail: Contact info grid** — email, phone, company, city displayed with icons.
- **Categories: Search** — search bar to filter tags by name.
- **Categories: Click-through** — tapping a tag navigates to filtered journal view.
- **Trends: Time range selector** — 7 Days / 30 Days / 90 Days / All Time toggle.
- **Trends: Monthly activity chart** — vertical bar chart showing entry counts per month.
- **Settings: Export journal** — export all entries as hledger-formatted text with copy-to-clipboard.
- **Settings: Import journal** — paste hledger blocks to import entries.
- **New Entry: Contact auto-suggest** — suggests matching contacts while typing.
- **New Entry: Toolbar buttons** — quick-insert indent, tag (`;`), and posting (`$`) helpers.
- **Entry Detail: Delete** — delete button with immediate store removal.
- **Entry Detail: Persistent edit** — save actually persists changes to Zustand store.
- **Zustand store** — centralized state management for entries, contacts, tags, and UI filters.
- **Enhanced sample data** — 14 entries across 7 contacts spanning 3 months, with extended contact fields (email, phone, company, city, notes).

### Changed

- Tab layout expanded from 5 to 6 tabs (Home, Journal, People, Categories, Trends, Settings).
- All screens migrated from static `SAMPLE_DATA` imports to Zustand store.
- Version bumped from 0.1.0 to 0.2.0.

## [0.1.0] — 2025-05-08

### Added

- Initial project planning and documentation setup.
- Architecture plan covering Expo, Supabase, and Tauri.
- Initial agent directives (`claude.md`, `gemini.md`, `data_agent.md`, `qa_agent.md`, `devops_agent.md`).
- Established hledger-style entry format requirements.
- `archive/` folder created to store old major release changelogs.
- Expo SDK 54+ project initialized with Expo Router v4.
- 5-tab navigation (Journal, People, Categories, Trends, Settings).
- hledger-style entry parser (`lib/parser.ts`) with round-trip formatting.
- Journal View with card list, search, and FAB.
- People directory with avatars and entry counts.
- Categories grouped by tag prefix.
- Trends with stats and bar charts.
- Settings with account and data sections.
- New Entry modal with monospace editor.
- Entry Detail with parsed view and edit mode.
- Person Detail with profile and entry list.
- Dark-mode-first design system from `design.md`.
