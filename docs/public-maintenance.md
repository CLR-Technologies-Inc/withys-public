# Public ownership, workspace and export contract

Owner decision: Leonard Robinson, 2026-09-10. Delivery: [CLR-551](https://linear.app/clr-technologies-inc/issue/CLR-551).

## Scope and cost

Preserve the existing barebones Expo application and its layout, journal/contact
model, themes, local storage, vault and thin Tauri wrapper. Public is limited to
5% of overall Withys token spend and 5% of overall Withys dollar spend, each a
ceiling. Keep necessary fixes small. Record estimates/actual usage with the
overall Withys allocation when available; never claim a measured percentage
without totals. Escalate an expected overrun before starting additional work.

Semgrep and Dependabot security maintenance are permitted. General CI expansion,
major refactors and new infrastructure are out of scope. Use local checks scaled
to the change. The budget does not waive data protection, encryption, safe key
handling or exclusion of private material. Keep unresolved security work in
Linear; do not publish vulnerability details in public handoff artifacts.

## Workspace and workflow

The `withys` and `withys-public` checkouts are siblings under the owner's
`Documents/1-Projects` directory, with separate Git directories and separate
saved Codex projects. Private's remote is `CLRTechDev/prm-journal`; Public's is
`CLRTechDev/withys-public`. Never add the private remote to Public or nest the
Public repository inside Private. The Public editor workspace opens only `.`.

Read each checkout's `agents.md` before working there. Private currently contains
uncommitted work: inspect immutable Git objects for export review, never its
working-tree bytes. Existing Public working directories are registered with
`git worktree list`; assign one writer to each directory and branch. This task
uses `codex/public-ownership-clr-551`, separate from the save-safety worktree.
No agents or schedules are launched by this contract.

For additional authorized work, from the matching repository:

```powershell
git fetch origin staging
git worktree add -b codex/<description>-<issue> ../withys-public-<issue> origin/staging
git worktree list
```

Use a unique sibling destination; never reuse an occupied worktree. Select the
matching saved Codex project for each task. Do not copy private work into Public
to make a test pass. Remove a worktree only after its work is committed/preserved
and its writer is finished; never force removal of another writer's checkout.

Feature PRs target `staging`. `main` is release-only; no direct pushes to either
branch. Protect both against force pushes/deletion, require a PR, resolved
conversations and the existing `semgrep/ci` check, including for administrators.
No extra reviewer seat is required for this small owner-maintained repository
(required approval count 0); review and local validation evidence still belong
in every PR. Production release authorization is separate from issue closure.

Dependabot alerts and security updates are allowed; dependency changes still
need review and applicable local checks. If a security-update PR targets the
repository's default `main`, retarget it to `staging` before merging. This
contract does not change the default branch or add version-update schedules.

## Ownership

[`public-export.json`](../public-export.json) is the source of truth. Only exact
`managedPaths` are eligible for upstream-managed export. Initial scope is the
ID and safe-URL utilities: neither has a local module dependency; URL handling
uses Public's existing React Native dependency and lockfile. Their dependency
closure was inspected at the manifest's `inspectedSourceRevision`. That records
an inspection, not approval to publish that revision or change runtime behavior.

Private is the authority for these shared utilities. Public owns all other
files by default, including routes/UI/themes, bootstrap, local adapters, vault,
AI key custody, tests, docs, packaging and license notices. Parsers, sentiment
and other potential shared modules remain Public-maintained until explicitly
classified and added with their full dependency closure in a reviewed manifest
change. Never replace them just because Private has a newer implementation.

## Export procedure (definition; no export performed by CLR-551)

1. Name the Linear issue, allowed features and Public baseline. Select a full
   40-character private commit and record approval evidence. Set
   `approvedSourceRevision` and `approvalEvidence` in the proposed export PR.
   Null values block execution. Branch names, dirty files and floating refs do
   not authorize an export. The manifest is declarative; it is not an exporter.
2. Read only the allowlisted files from that commit, e.g. `git show <sha>:<path>`.
   Review every static/dynamic import, re-export, asset and runtime requirement.
   Add newly discovered dependencies explicitly or stop. Hosted imports, path
   traversal, symlinks, submodules and unresolved dependencies block export.
   Review external APIs against version-matched documentation and Public's
   lockfile; package/config changes require a separate explicit Public diff.
3. Reconcile Public-origin shared fixes upstream first (procedure below).
   Produce a dry-run diff against the Public staging base before writing.
   Verify public behavior: even eligible utilities can differ in supported
   protocols, signatures or other semantics. Eligibility is not compatibility.
4. Apply only reviewed target paths in a Public feature worktree. Preserve
   Public-owned files and history. Never merge/cherry-pick private commits,
   mirror a repository or delete unlisted files. Never export private history,
   hosted services, billing forecasts, runbooks, credentials, customer data,
   environment files, logs, dumps, backups, source maps or build output.
5. Inspect the entire resulting diff/output for secrets and excluded content.
   Run focused tests and the existing Semgrep check. For a runtime export, also
   run typecheck and a web build from Public alone with its own lockfile and no
   private service credentials. Check startup, journal/contact operations and
   vault behavior as affected, using synthetic data. Record network/deep-link
   evidence when edition boundaries change. No new general CI is required.
6. Return the PR to `staging`, exact source/base revisions, file hashes and
   dependency inventory, approval/reconciliation links, checks and limitations.
   Merge only after checks pass and review is recorded. Revert a Public export
   through a new staging PR if needed; never reset published branch history.

The first actual export is separate implementation work. CLR-550 owns capability
enforcement; CLR-558 owns export implementation/validation, subject to the
owner's security-only CI direction. Closing this contract does not mark either
capabilities or the first export complete.

## Public-origin shared fixes

Link the Public fix/PR to an upstream reconciliation issue. Reapply the minimal
source change in a private feature branch from private `staging`; verify hosted
compatibility and merge through its PR workflow. The next export's approved
source revision must include that fix. If upstream cannot accept it, retain the
Public change and block export of the affected path until the divergence is
resolved or the manifest transfers that path to Public ownership. Do not
overwrite a fix or keep two silently diverging implementations.

## Required implementation handoff

Copy this record into the bounded Linear issue/PR, replacing every placeholder:

```text
Issue and outcome:
Repository / Codex project / assigned writer:
Worktree / feature branch / exact origin/staging base SHA:
Allowed paths / approved capabilities / excluded services:
Private source SHA and approval evidence (or no source export):
Managed paths, dependency closure, Public-owned files to preserve:
Public-fix reconciliation PRs (or none with reason):
Expected token/dollar cost and overall Withys allocation reference:
Local checks / security checks / hosted compatibility checks:
Returned evidence: staging PR, commit(s), hashes, results and remaining gaps:
Release authorization: separate; none implied:
```

For documentation-only changes, JSON/path/link validation and `git diff --check`
plus Semgrep are sufficient; do not install/build the app just for documentation.
