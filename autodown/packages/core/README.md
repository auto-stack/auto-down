# @autodown/core — DEPRECATED (re-export shim)

**Superseded by [`@autodown/engine`](../engine/).** This package is a frozen
re-export shim: `@autodown/core` → `@autodown/engine/parser`.

- Deprecation ruling: plan 020 Phase 4 (2026-08-28) — in-repo consumers
  (demo / jade-garden) have switched to `@autodown/engine`; musk consumes the
  frozen 0.2.0 vendor snapshot, not this package.
- Physical archival (directory removal) executes once the musk vendor
  regeneration path is confirmed obsolete — DEBTS.md 020 row tracks it.
- The `rust/` crate (autodown-core, dual-platform parser + a2r golden
  parity) is NOT part of the npm shim and stays.
