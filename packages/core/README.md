# Withys ID utility pilot

Licensed under BSD-3-Clause, with the existing CLRTechDev copyright notice in LICENSE.
The owner selected this license for the ID package. The private flag intentionally
blocks npm registry publication; both apps use the exact vendored pilot artifact.
This candidate does not alter the application's framework versions.

Exports: generateSecureId(length = 9, chars = 'abcdefghijklmnopqrstuvwxyz0123456789')
and generateSecureUuid(). IDs retain the nine-character lowercase/digit default;
existing stored IDs are never rewritten. UUIDs retain version 4 and RFC variant bits.
Lengths must be non-negative safe integers. Alphabets must contain 1–256 UTF-16
code units; existing code-unit and duplicate-character semantics are preserved.
Invalid inputs now throw instead of hanging or silently accepting invalid lengths.

The only runtime requirement is globalThis.crypto.getRandomValues. Hosts supply
their existing Web Crypto implementation/polyfill. No network, storage, framework,
install hook, fallback RNG or runtime dependency is included. Buffered rejection
sampling is retained. This utility is for record IDs, not authentication secrets.

Development: npm ci --ignore-scripts; npm test; npm pack --ignore-scripts after build.
TypeScript 5.9.3 is a build-only dependency. The artifact contains only JavaScript,
declarations, this README, the license notice and package metadata; no source maps.
