---
"@autodown/core": patch
"@autodown/editor": patch
---

Rewrite `@autodown/core` (IAL utilities) and `CodeLanguageIcon` in the Auto language, compiled to TS/Vue via the Auto compiler (a2ts / ui_gen). Public APIs and rendered output are unchanged; handwritten originals are kept as `.bak` references. See `packages/core/auto/README.md` and `packages/editor/src/auto/README.md` for the generation pipelines.
