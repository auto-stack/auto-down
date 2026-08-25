---
'@autodown/engine': minor
'@autodown/core': minor
'@autodown/vue': minor
'@autodown/editor': minor
---

plan 017: render unification and package merge. New `@autodown/engine` 0.3.0 — parser / render / editor in one multi-exit package (`.` / `./parser` / `./render` / `./editor` / `./style.css`), registry-driven panel renderer with the palette map as single source (auto/palette_map.at), unified katex/mermaid preview implementation. `@autodown/core`, `@autodown/vue` and `@autodown/editor` become re-export shims forwarding to engine — same public surfaces, zero consumer changes; retirement is planned with plan 020.

DOM note (the only sanctioned break): the renderer root class `markstream-vue markdown-renderer` is now `markdown-renderer`. Consumers audited clean (demo, jade-garden); auto-musk noted as a plan 020 coordination item.
