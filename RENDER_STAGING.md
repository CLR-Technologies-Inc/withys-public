# Render Staging Deployment

> Staging static site for validating Expo frontend changes before pushing to Vercel production.

## Architecture

```
┌─────────────────────┐
│  Render Static Site  │
│  (staging frontend)  │──┐
└─────────────────────┘  │
                         ▼
┌─────────────────────┐    ┌──────────────────────────┐
│  Vercel Static Site  │───▶│   Local Client Browser   │
│  (production front)  │    │ (AsyncStorage / Secure)  │
└─────────────────────┘    └──────────────────────────┘
```

Both environments are deployed as static web pages. All application state is fully contained and executed within the local user's browser, using local storage. No centralized database is required.

---

## Setup (One-Time)

### Option A: Render Blueprint (Recommended)

1. Push this repo to GitHub (or connect your existing remote)
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Select this repository — Render will auto-detect `render.yaml`
4. Click **Apply** — Render builds and deploys automatically

### Option B: Manual Static Site

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Static Site**
2. Connect your repository
3. Configure:

   | Setting | Value |
   |---|---|
   | **Name** | `wwlo-prm-staging` |
   | **Root Directory** | `app` |
   | **Build Command** | `npm install && npx expo export -p web` |
   | **Publish Directory** | `dist` |

4. Under **Redirects/Rewrites**, add:
   - Source: `/*` → Destination: `/index.html` → Type: **Rewrite**
5. Deploy

---

## Branch Strategy

The project uses two long-lived branches to separate staging from production:

```text
feature/* ──PR──▶ staging ──release──▶ main
                     │                   │
                 Render 🔄           Vercel 🔄
                (staging)          (production)
```

| Branch | Deploys To | Trigger |
|--------|-----------|---------|
| `main` | Vercel (production) | Push to `main` (version skill only) |
| `staging` | Render (staging) | Push to `staging` or PR merge |
| `feature/*` | Render PR preview | PR opened against `staging` |

> **Rule:** Nothing reaches `main` without first being validated on `staging`. Main is a protected, release-only branch.

---

## Workflow

### Day-to-Day Development

```text
1. Create feature branch from staging
2. Push feature branch → open PR targeting staging
3. Render creates a PR preview URL automatically
4. Review and merge PR into staging
5. Render auto-deploys → validate at https://wwlo-prm-staging.onrender.com
```

### Releasing to Production

```text
1. Run the version skill (/version or /version-regression)
2. Version skill merges staging → main, bumps version, tags
3. Push to main triggers Vercel production deploy
4. Version skill back-syncs main → staging to stay aligned
```

### PR Preview Deploys

`render.yaml` has `pullRequestPreviewsEnabled: true` — every PR targeting `staging` gets its own preview URL automatically.

### Jules PR Routing

GitHub's **default branch** is set to `staging`. This means:
- Jules PRs automatically target `staging` (not `main`)
- Manual PRs default to `staging`
- `main` is protected — no direct pushes allowed

To override for a specific Jules task, add to the task prompt:
> "Create a PR targeting the `main` branch."

---

## Environment Variables

For basic execution, no environment variables are required. Set these in the Render Dashboard → Environment if needed:

```env
NODE_ENV=production
```

---

## Differences from Vercel Production

| Aspect | Vercel (prod) | Render (staging) |
|---|---|---|
| URL | Your custom domain | `wwlo-prm-staging.onrender.com` |
| Auto-deploy branch | `main` | `staging` |
| PR previews | Vercel previews | Render PR previews |
| CDN | Vercel Edge | Render CDN |
| Cost | Free tier | Free tier (750 hrs/mo) |
| Backend | Local Storage | Local Storage |
| Default PR target | N/A | `staging` (GitHub default branch) |

---

## Free Tier Limits (Render Static Sites)

- **Bandwidth**: 100 GB/mo
- **Build minutes**: 500/mo
- **Sites**: Unlimited
- **Custom domains**: Supported
- **Auto-deploy**: From connected Git repo

More than sufficient for a staging environment with a handful of testers.
