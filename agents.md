# agents.md

> Default behaviors, standards, and guidelines for autonomous agents and engineers operating within this CI/CD deployment system.

---

## 1. Purpose and Scope

This document defines the operating contract for all agents (human or automated) that build, test, deploy, monitor, or modify code in this system. It establishes baseline expectations for code quality, pipeline behavior, observability, security, and developer experience.

**In scope:**
- Pipeline configuration, build/test/deploy logic, rollback procedures
- Code style, structure, typing, documentation
- Performance, memory, and resource hygiene
- Logs, metrics, traces, dashboards, error messages
- Security and compliance defaults
- Developer ergonomics (naming, output formatting, CLI behavior)

**Out of scope:**
- Business logic decisions, product requirements, feature design
- Architectural rewrites or platform migrations
- Anything that changes user-facing system behavior

Agents must not introduce new features, alter contracts, or change runtime semantics under the guise of "improvements." Refactoring is allowed only when behavior is preserved and verified by existing tests.

---

## 2. Core Principles

1. **Behavior preservation first.** Never change what the system does. Change only how it does it.
2. **Boring beats clever.** Prefer the most obvious, well-understood solution. Optimize for the next engineer reading the code at 2 AM.
3. **Idempotency by default.** Any pipeline step, deployment action, or agent operation must be safely re-runnable without side effects.
4. **Fail fast, fail loud, fail safe.** Detect errors early, surface them clearly, and degrade gracefully when recovery isn't possible.
5. **Reversibility.** Every deploy must have a tested rollback path. Every destructive action must be gated.
6. **Single source of truth.** Configuration, secrets, and infrastructure definitions live in one canonical place — version-controlled.
7. **Explicit over implicit.** No hidden state, no magic environment variables, no undocumented defaults.
8. **Small, frequent, observable changes.** Smaller diffs deploy more safely than large ones.

---

## 3. CI/CD Pipeline Standards

### 3.1 Pipeline Structure

Every pipeline must follow this canonical stage order:

```
lint → static-analysis → unit-test → build → integration-test → security-scan → deploy → smoke-test → observability-check
```

Stages must be **independent, idempotent, and cacheable**. A failure in any stage halts the pipeline; no stage may be skipped without an explicit, logged override.

### 3.2 Build Stage

- Builds must be **deterministic and reproducible**. Same input commit → same output artifact (byte-identical where possible).
- Pin all dependency versions. No floating tags (`latest`, `main`, `*`).
- Use lockfiles (`package-lock.json`, `poetry.lock`, `go.sum`, `Cargo.lock`) and verify them in CI.
- Build artifacts must be immutable and content-addressed (SHA digest, not mutable tag).
- Cache aggressively but invalidate correctly. Cache keys must include lockfile hashes.

**Example — bad vs. good Docker tag:**
```yaml
# BAD
image: myapp:latest

# GOOD
image: myapp@sha256:a3f5...e9b1
```

### 3.3 Test Stage

- **Unit tests** run in under 5 minutes total. If they don't, parallelize or split.
- **Integration tests** run against ephemeral environments, never shared staging.
- **No flaky tests.** A test that fails intermittently is broken. Quarantine within 24 hours, fix or delete within one sprint.
- Coverage thresholds are enforced in CI, not advisory. Drops fail the build.
- Test data is generated, not committed. Fixtures are minimal and explicit.

### 3.4 Deploy Stage

- **Progressive rollout is mandatory** for production: canary → percentage-based → full. Never deploy 100% in one step.
- Health checks gate every promotion step. Failed health checks trigger automatic rollback.
- Deploys are **declarative** (GitOps, Terraform, Helm, Kustomize) — never imperative scripts run by hand.
- Database migrations are decoupled from application deploys: migrate first, deploy second, and migrations must be backward-compatible for at least one prior app version.
- Every deploy produces an audit record: who, what commit, when, where, outcome.

### 3.5 Rollback

- Rollback is a **first-class operation**, not an emergency procedure. It must be testable and tested.
- Rollback time objective: under 5 minutes from decision to restored state.
- Automated rollback triggers on: health check failure, error rate spike (>2x baseline for 5 min), latency regression (>50% p99 for 5 min).
- Rolling back is never a failure of the engineer. Rolling back late is.

### 3.6 Observability Check

The pipeline must verify that deployed artifacts emit expected logs, metrics, and traces before marking deploy successful. A silent service is a broken service.

---

## 4. Code Design Guidelines

### 4.1 Modularization

- **One module, one responsibility.** If you can't describe a module in one sentence without "and," split it.
- Public interfaces are explicit and minimal. Everything else is private.
- No circular dependencies. Ever. CI must enforce this with static analysis.

### 4.2 Separation of Concerns

Strict layering — code in a higher layer may call lower layers, never the reverse:

```
handlers / controllers   ← request shape, validation, response formatting
    ↓
services / use-cases     ← business logic, orchestration
    ↓
adapters / repositories  ← I/O, external systems, persistence
    ↓
domain / entities        ← pure data and rules, no I/O
```

Domain code must not import from handlers. Repositories must not contain business rules.

### 4.3 Stateless Services

- Services hold no in-process state across requests. State lives in databases, caches, or message queues.
- Any required state is externalized and explicitly fetched.
- This makes horizontal scaling, restarts, and rolling deploys trivial.

### 4.4 Idempotency

- Every write operation accepts an idempotency key or is naturally idempotent (e.g., `PUT` semantics).
- Retries must be safe by default.
- Pipeline steps re-run without corruption.

### 4.5 Error Handling

- Errors are values, not control flow. Use explicit return types (`Result<T, E>`, tagged unions, `error` returns) over exceptions where the language supports it.
- Never swallow errors silently. If an error is intentionally ignored, log it at `debug` level with a comment explaining why.
- Error messages must include: what was attempted, what failed, what the caller can do about it.

**Example:**
```python
# BAD
raise Exception("error")

# GOOD
raise DeploymentError(
    f"Failed to apply manifest {manifest_path} to cluster {cluster_id}: "
    f"kubectl returned exit code {code}. "
    f"Verify cluster credentials and manifest syntax, then retry."
)
```

### 4.6 Naming

- Names describe intent, not implementation. `retryWithBackoff` not `wrapperFunc`.
- No abbreviations except universally understood ones (`id`, `url`, `http`).
- Booleans read as questions: `isReady`, `hasExpired`, `canRetry`.
- Functions are verbs; variables are nouns.

---

## 5. Performance and Memory Practices

### 5.1 Resource Usage

- Set explicit CPU and memory limits on every container, job, and process. Unbounded resources are a production incident waiting to happen.
- Right-size based on observed p95 utilization plus 30% headroom — not guesses.
- Fail loudly on OOM. Silent restarts hide capacity problems.

### 5.2 Caching

- Cache at the **boundary closest to the consumer** that still allows correct invalidation.
- Every cache entry has an explicit TTL. No infinite caches.
- Cache keys are deterministic, versioned, and namespaced: `service:v3:user:{id}:profile`.
- Document cache invalidation strategy at the call site. If you can't explain when it invalidates, you don't understand it.

### 5.3 Avoiding Leaks

- Close every resource you open: file handles, sockets, DB connections, goroutines, event listeners.
- Use language idioms (`with`, `defer`, `using`, `try-with-resources`) — never manual cleanup in long handlers.
- Bound every queue, channel, and buffer. Unbounded means "OOM eventually."
- Long-running agents must run under a memory profiler in CI at least weekly.

### 5.4 Minimizing Compute Overhead

- Profile before optimizing. Premature optimization rarely targets the actual hot path.
- Batch I/O operations. N+1 queries are a defect, not a style preference.
- Prefer streaming over buffering for large payloads.
- Avoid synchronous calls in hot paths; use async I/O where the runtime supports it well.

### 5.5 Database Hygiene

- Every query has an index that supports it, or an explicit comment explaining why a full scan is acceptable.
- `EXPLAIN` plans are reviewed in PRs that touch query logic.
- Connection pools are sized and monitored. Connection exhaustion is a top-3 incident cause across most systems.

---

## 6. UI/UX and Developer Experience

This system's "users" are engineers and other agents. Their UI is logs, CLIs, dashboards, and error messages. Treat them with the same care you'd give a customer-facing product.

### 6.1 CLI and Tool Output

- Default output is human-readable. `--json` (or equivalent) produces machine-readable output for agents.
- Exit codes are meaningful: `0` success, `1` general failure, `2` misuse, custom codes documented.
- Progress is visible for any operation taking longer than 2 seconds.
- Color and emoji are optional and disabled in non-TTY environments.

### 6.2 Error Messages

Every error message answers three questions:
1. **What happened?** ("Failed to push image to registry.")
2. **Why?** ("Authentication rejected — token expired at 2025-11-14T08:00Z.")
3. **What now?** ("Run `agent auth refresh` and retry, or see docs/auth.md.")

Stack traces are for debug logs, not user-facing output. Wrap them.

### 6.3 Logs as UX

- One event per log line. No multi-line prose.
- Structured logs (JSON) in production; human-friendly in local dev.
- Required fields: `timestamp`, `level`, `service`, `trace_id`, `event`, `message`.
- Log at the right level: `error` for actionable failures, `warn` for degraded states, `info` for state transitions, `debug` for diagnostics. `info` is not a dumping ground.

### 6.4 Dashboards

- Every service has a default dashboard with the four golden signals: latency, traffic, errors, saturation.
- Dashboards load in under 5 seconds. Slow dashboards don't get used.
- Default time range is 1 hour. Default refresh is 30 seconds.
- Each panel has a one-line description of what it shows and what "bad" looks like.

### 6.5 Naming and Structure (Developer-facing)

- Repository structure is consistent across services. New engineers should find `cmd/`, `internal/`, `tests/`, `deploy/` (or the language equivalent) without searching.
- Configuration files live at predictable paths. No surprise YAML in `lib/utils/misc/`.
- Environment variables are namespaced by service: `BILLING_DB_URL`, not `DB_URL`.

---

## 7. Observability and Logging Standards

### 7.1 The Three Pillars

- **Logs:** what happened, in detail, for one request or event.
- **Metrics:** aggregated numerical state over time, for trends and alerting.
- **Traces:** the path of one request across services, for diagnosing distributed issues.

Every service emits all three. None is optional.

### 7.2 Tracing

- Propagate trace context (W3C Trace Context or equivalent) across every service boundary, including async ones.
- Span every external call, every DB query over 50ms, and every business-significant operation.
- Span names are stable and low-cardinality. Don't put user IDs in span names.

### 7.3 Metrics

- Use RED (Rate, Errors, Duration) for request-driven services.
- Use USE (Utilization, Saturation, Errors) for resources.
- Histograms for latency, never just averages. Average latency lies.
- Cardinality discipline: tags must have bounded value sets. Never tag by `user_id`, `request_id`, or `email`.

### 7.4 Alerting

- Alert on **symptoms users feel**, not causes. "Checkout error rate > 1%" beats "CPU > 80%."
- Every alert has a runbook link. Alerts without runbooks are deleted within 30 days.
- Alert fatigue is a bug. If an alert fires more than once a week without action, it's miscalibrated.

### 7.5 Audit Trails

- Every deploy, config change, secret rotation, and privileged operation produces an immutable audit record.
- Audit logs are stored separately from operational logs and retained per compliance requirements.

---

## 8. Security and Compliance Basics

### 8.1 Secrets

- Secrets never live in source code, container images, environment files committed to git, or CI logs.
- Use a managed secrets system (Vault, AWS Secrets Manager, GCP Secret Manager, sealed-secrets).
- Secrets are rotated on a schedule. Rotation is automated.
- Detected secret leaks trigger immediate rotation, not a Jira ticket.

### 8.2 Least Privilege

- Every service, pipeline, and agent runs with the minimum permissions required.
- Default IAM/RBAC policies are deny-all. Permissions are added explicitly with justification.
- Production credentials are not accessible from developer laptops.

### 8.3 Supply Chain

- All dependencies pulled from trusted, mirrored registries.
- SBOMs (Software Bill of Materials) generated for every build artifact.
- Vulnerability scans run on every build. Critical CVEs block deploy.
- Container base images are minimal (distroless, alpine, or scratch where feasible) and updated weekly.

### 8.4 Network Posture

- Default-deny network policies between services. Allowlist explicit traffic.
- TLS everywhere, including internal service-to-service traffic.
- No public ingress without WAF and rate limiting.

### 8.5 Compliance

- Data classification is explicit at the schema level (PII, financial, health, public).
- Retention and deletion policies are codified and tested.
- Compliance evidence (SOC2, ISO27001, etc.) is generated from the system, not assembled manually before audits.

---

## 9. Reliability and Scalability Patterns

### 9.1 Fault Tolerance

- Every external call has a timeout. No defaults — explicit values, justified.
- Retries use exponential backoff with jitter. Naive retries cause thundering herds.
- Maximum retry count is bounded. Infinite retries hide root causes.

### 9.2 Circuit Breakers

- Wrap calls to unstable dependencies in circuit breakers.
- Open state must be observable (metric + log).
- Half-open probes are explicit, not magical.

### 9.3 Graceful Degradation

- Services define what "degraded mode" looks like. A search service without recommendations still returns results.
- Degraded responses are visible in metrics so degradation isn't silent.

### 9.4 Backpressure

- Queues, workers, and APIs apply backpressure when overloaded — they don't accept work they can't complete.
- Reject fast with a clear error rather than queue indefinitely.

### 9.5 Capacity Planning

- Load tests run quarterly minimum, against production-like environments.
- Headroom of at least 2x peak observed traffic is maintained.
- Autoscaling rules are tested by inducing load, not just configured.

---

## 10. Anti-Patterns to Avoid

These are bright-line don'ts. Agents and engineers should refuse or flag any work that requires them.

| Anti-pattern | Why it's bad |
|---|---|
| **Pushing to `main` without CI passing** | Defeats the entire purpose of CI. |
| **Manual production changes ("just this once")** | Drifts state, breaks GitOps, hides the change from auditing. |
| **Disabling tests to make a build pass** | Trades a known problem for an unknown one. |
| **`latest` tags in production** | Non-reproducible deploys, impossible rollback. |
| **Catch-all exception handlers that log and continue** | Hides failures until they become incidents. |
| **Shared mutable state between services** | Couples services, prevents independent scaling, causes race conditions. |
| **God services or god classes** | Become unmaintainable and unownable. |
| **Long-lived feature branches** | Merge hell, drift from main, integration risk. |
| **Configuration in code** | Requires a deploy to change behavior. |
| **Code in configuration** | Untestable, undebuggable, unreviewable. |
| **Logging secrets, tokens, or PII** | Compliance breach, security incident. |
| **Unbounded retries or queues** | Eventually consume all resources. |
| **Synchronous fan-out to many services** | Latency multiplies, failure probability multiplies. |
| **Custom rolled crypto, auth, or rate limiting** | Use proven libraries. Always. |
| **"Temporary" workarounds without expiry** | Become permanent. Tag with a removal date and ticket. |

---

## 11. Agent-Specific Behaviors

For autonomous agents operating in this system:

- **State your intent before acting.** Print the plan; execute only after it's verifiable.
- **Prefer dry-run modes** when available. Show the diff before applying.
- **Stop on ambiguity.** If a task could be interpreted two ways, ask or refuse — don't guess.
- **Respect blast radius.** Operations touching production require explicit confirmation tokens, not just flags.
- **Leave the campsite cleaner.** Fix small issues you encounter (typos in comments, dead imports) — but in separate commits, not bundled with feature work.
- **Document decisions, not just actions.** When you choose path A over path B, record why.
- **Surface uncertainty.** Confidence levels in agent output help reviewers calibrate trust.

### 11.1 Git Branching Strategy & PR Targeting

This project uses a **staging-first** deployment model. All changes must be validated on staging before reaching production.

```text
feature/* ──PR──▶ staging ──release──▶ main
                     │                   │
                 Render 🔄           Vercel 🔄
                (staging)          (production)
```

**Rules for all agents (including Jules, Bolt, Palette, Sentinel):**

1. **All PRs must target the `staging` branch.** Never open a PR against `main` unless explicitly instructed to do so in the task prompt.
2. **All feature branches must be created from `staging`.** Use `git checkout -b <branch-name> origin/staging`.
3. **`main` is a protected, release-only branch.** Only the version release skill merges `staging → main`.
4. **Do not push directly to `main` or `staging`.** Always use a feature branch and PR.
5. **Branch naming:** Use the pattern `<agent>/<description>-<task-id>` (e.g., `bolt/optimize-sentiment-12886968799295054428`).

> ⚠️ **If a task prompt says "create a PR" without specifying a target branch, always target `staging`.**

See `RENDER_STAGING.md` for full deployment architecture details.

### 11.2 Context7 Documentation Verification (Code Review)

All agents performing code reviews — including **Bolt** (performance), **Palette** (design/UX), and **Sentinel** (security) — **must** use the [Context7 MCP server](https://github.com/upstash/context7) to verify library and framework API usage before approving changes.

#### When to Use Context7

Use Context7 during code review when the PR touches:
- **New dependency imports** — Verify the API is current and not deprecated
- **React Native / Expo APIs** — Confirm hook signatures, component props, and platform-specific behavior
- **Supabase client calls** — Validate RPC, auth, and realtime API usage against the latest SDK
- **Security-sensitive libraries** — Confirm crypto, auth, or token-handling APIs are used correctly
- **Any API you are not 100% certain about** — When in doubt, query Context7

#### How to Use Context7

Context7 exposes two tools via MCP:

1. **`resolve-library-id`** — Convert a library name to a Context7-compatible ID:
   ```
   resolve-library-id("expo-secure-store")
   → /expo/expo-secure-store
   ```

2. **`query-docs`** — Retrieve current documentation for a specific topic:
   ```
   query-docs("/expo/expo-secure-store", "setItemAsync parameters")
   → Returns version-specific API docs, parameters, return types, and usage examples
   ```

#### Code Review Checklist (Context7)

When reviewing a PR, add these checks to your review flow:

| Check | Action |
|-------|--------|
| New `import` from an external package | `resolve-library-id` → `query-docs` to verify the imported API exists and the usage matches current docs |
| Changed function signatures or hook params | `query-docs` to confirm the parameter order, types, and defaults are current |
| Deprecated API warnings in the diff | `query-docs` to find the recommended replacement |
| Security-critical API calls (crypto, auth, tokens) | `query-docs` to verify the call pattern matches the library's security guidance |
| Platform-specific behavior (web vs. native) | `query-docs` to check for platform caveats or conditional imports |

#### What to Report

If Context7 reveals a discrepancy:
- **Flag it in the review** with the correct API usage from Context7
- **Cite the source**: include the library name and version from Context7's response
- **Suggest the fix**: provide the corrected code based on current documentation
- **Do not approve** until the discrepancy is resolved

#### Fallback

If Context7 is unavailable (network error, MCP not connected), note it in the review:
> ⚠️ Context7 unavailable — API verification skipped. Manual documentation check recommended.

Do not block the review solely because Context7 is down, but flag the gap.

---

## 12. Enforcement

- This document is enforced through CI checks, linters, code review, and runtime guards — not goodwill.
- Exceptions require a written justification linked from the code or config that violates the rule.
- This file is versioned. Changes go through PR review like any other code.
- Conflicts between this document and ad-hoc instructions are resolved in favor of this document unless explicitly overridden by a named owner.

---

*Last reviewed: keep this file current. If you read it and something is stale, fix it.*
