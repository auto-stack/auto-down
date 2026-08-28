# @autodown/editor — DEPRECATED (re-export shim)

**Superseded by [`@autodown/engine`](../engine/).** This package is a frozen
re-export shim: `@autodown/editor` → `@autodown/engine/editor` (+ style.css).

- Deprecation ruling: plan 020 Phase 4 (2026-08-28) — in-repo consumers have
  switched to `@autodown/engine`; musk's editor integration closed as a stub
  equivalence (musk PLAN-041 T10 ruling, 2026-08-26), no live consumer.
- The Tiptap-era `ARCHITECTURE.md` stays for history; the live layered
  contract lives in `packages/engine/ARCHITECTURE.md` (plan 020 Phase 5).
- Physical archival executes once the musk vendor regeneration path is
  confirmed obsolete — DEBTS.md 020 row tracks it.
