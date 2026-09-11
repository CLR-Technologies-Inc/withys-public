# Contributing to PRM Journal

Thank you for contributing! Please follow these guidelines to keep the project consistent and the CI/CD pipeline healthy.

For Withys Public, the [Public maintenance contract](../docs/public-maintenance.md)
supersedes the generic tracking/CI guidance below: Linear owns delivery tracking;
GitHub reports are community intake and PRs provide review evidence. Retain
Semgrep and Dependabot security maintenance, use proportionate local checks, and
preserve the existing application structure within the 5% token/dollar budgets.

---

## Branch Strategy

This project uses a **staging-first** deployment model:

```
feature/* ──PR──▶ staging ──release──▶ main
                     │                   │
                 Render 🔄           Vercel 🔄
                (staging)          (production)
```

### Rules

1. **All PRs must target the `staging` branch.** Never open a PR against `main` unless explicitly instructed by a maintainer.
2. **All feature branches must be created from `staging`.**
   ```bash
   git checkout -b <branch-name> origin/staging
   ```
3. **`main` is a protected, release-only branch.** Only the version release workflow merges `staging → main`.
4. **Do not push directly to `main` or `staging`.** Always use a feature branch and PR.
5. **Branch naming:** Use the pattern `<author>/<description>` (e.g., `palette/improve-empty-state`).

> ⚠️ **Bots / Agents (Jules, Dependabot, etc.):** If your task says "create a PR" without specifying a target branch, **always target `staging`**.

---

## GitHub Issues

All feature requests, bugs, and enhancements are tracked via [GitHub Issues](https://github.com/CLRTechDev/prm-journal/issues).

### Issue Labels

Every issue should have **three labels**:

| Category | Labels |
|----------|--------|
| **Priority** | `P1-critical` · `P2-high` · `P3-medium` · `P4-low` |
| **Area** | `area/people` · `area/journal` · `area/pwa` · `area/backend` · `area/ux` · `area/security` · `area/google` · `area/desktop` · `area/import-export` · `area/ai` |
| **Type** | `type/bug` · `type/feature` · `type/enhancement` · `type/audit` |

### Milestones

Assign every issue to a milestone:

| Milestone | When to assign |
|-----------|---------------|
| `v0.13 — People & UX` | People page features, onboarding, quick entry |
| `v0.14 — Platform Hardening` | PWA, version drift, responsive, service worker |
| `v1.0 — Production Ready` | Security, auth, encryption hardening |
| `Backlog` | P3/P4 items or anything without a clear release target |

### Issue Title Convention

Prefix the title with the priority tag:

```
[P2] CSV Export — People Page
[P1] Fix broken OAuth callback on mobile
[P3] Add loading skeleton to Trends screen
```

> ⚠️ **Bots / Agents:** When creating issues, always include a priority label, an area label, a type label, and a milestone assignment.

---

## Code Quality

Before submitting a PR, ensure:

- [ ] `npx expo lint` passes with no errors
- [ ] `npx tsc --noEmit` passes with no type errors
- [ ] Your changes work on web (`npx expo start --web`)
- [ ] Commit messages are descriptive and follow conventional style

---

## Security

- Never commit secrets, API keys, or PII to the repository
- See `agents.md` § Security and Compliance for full policy
- Report vulnerabilities privately — do not open public issues for security bugs
