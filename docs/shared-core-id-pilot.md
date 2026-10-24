# ID utility shared-core pilot

The existing app/lib/idUtils.ts entry point re-exports generateSecureId and
generateSecureUuid from the same versioned artifact in both apps. Private Withys
remains authoritative for packages/core/src/idUtils.ts. Public receives only the
nine files enumerated in public-export.json; Public-origin fixes to this source
must be reconciled upstream before a later export. Other utilities are excluded.

## License and distribution

Leonard Robinson selected BSD-3-Clause for this ID package on 2026-10-24. The
package preserves Public's existing LICENSE text and Copyright (c) 2026, CLRTechDev
notice exactly. Narrow source/history and notice review found no specific external
source attribution or conflicting notice. AI authorship was not treated as proof
of provenance. This decision applies only to the ID package; application and
dependency licenses are unchanged. TypeScript 5.9.3 remains Apache-2.0, build-only,
and absent from the distributed artifact.

Both apps pin @withys/core 0.1.0-pilot.3 to
file:../artifacts/withys-core-0.1.0-pilot.3.tgz with identical SHA-512 integrity.
The package retains private=true to block npm registry publication. The five-file
archive contains JavaScript, declarations, package metadata, README and LICENSE:
zero runtime dependencies, install hooks or source maps. The runtime SBOM and
SHA-256/SHA-512 manifest accompany it. No registry/release asset is published.

Never overwrite a candidate version or replace a pin with latest, a branch or a
range. Source, license, dependency or build changes need a new version and matching
tests. Pilot.2 supersedes the unlicensed local pilot.1; the earlier private/local
candidate is retained as history and is not part of the Public draft publication.

## Verification

From packages/core: npm ci --offline --ignore-scripts, then npm test. From the root:
node tools/verify-id-core.cjs; optionally supply the peer worktree path to compare exact bytes
and consumer pins. Repack only to a fresh scratch directory with npm pack
--ignore-scripts --pack-destination <scratch-directory> after npm run build.
Compare the resulting digest with the artifact manifest. Recorded tools are
Node 24.14.1, npm 11.11.0 and locked TypeScript 5.9.3. LF attributes fix package
input line endings across checkouts.

Focused tests cover defaults, zero length, configured alphabets, rejection sampling,
buffer refill, missing/failing crypto, invalid input rejection and UUID bits. The
nine-character lowercase/digit default and valid-input behavior remain intact;
stored IDs are never migrated. Both apps supply their existing Web Crypto runtime.
This utility generates record IDs; a uniqueness smoke test is not a randomness proof.

## Review, integration and rollback

Selective Public draft publication is owner-authorized. Full Public application
typecheck/web build and existing security/review acceptance remain integration
gates. Package/consumer checks do not establish complete Expo app acceptance.
No workflow is enabled or changed, and no registry release, merge, deployment or
v0.26 inclusion is authorized by this pilot. Public save-safety fixes, framework
versions, storage/vault, billing and sync remain unchanged.

Rollback through a new PR restores app/lib/idUtils.ts and its package/lock entry
together. Existing IDs need no migration. Preserve prior artifacts and Git history;
never reset published history. The pilot proves the export process, with no claim
of measured CI savings.

Artifact SHA-256: ea67378fd39f68a2b47e910cff866d2f1f923b715fb187d6f2052f8137f42a58.

Focused pilot.2 validation (2026-10-24): both 8/8 package tests, exact-lock offline
consumer installs, wrapper types/runtime, 200 deterministic compatibility outputs,
rollback rehearsals, byte-identical repack, approval/allowlist guards and targeted
secret checks passed. Full application checks remain unrun. The existing Semgrep
pull-request check is retained; no workflow or scanner was enabled or dispatched.

Pilot.3 repairs the 21 introduced DeepSource hygiene findings: inferred parameter
types, template literals, explicit Boolean conversion and assertions that require
undefined metadata values. Emitted JavaScript and declarations are byte-identical
to pilot.2. Prior artifact bytes remain unchanged and retained.

Focused pilot.3 validation (2026-10-24): 8/8 tests in each repository; 200
compatibility outputs; offline consumer installs, wrapper types/runtime, rollback,
reproducible pack, export guards, hashes and notices passed. The actual verifier
rejected 72 defined dependency/install-hook mutations, including falsy values.
Full application validation remains unrun. Existing automatic checks are tracked
on the published candidate; no scanner configuration or workflow changed.
