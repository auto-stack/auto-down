---
'@autodown/engine': minor
'@autodown/core': minor
'@autodown/vue': minor
'@autodown/editor': minor
---

plan 018: Tiptap retired. `AutoDownEditor` now mounts the self-built editing engine — per-leaf-block contenteditable hosts over the 016 op sequences, live preview via the ./render pipeline (focused block = source, others = preview), slash menu reused unchanged through a chain adapter, markdown paste, input rules with one-step undo. BREAKING: `createExtensions` / `useAutoDownEditor` / `CodeBlockMenu` are removed; migrate `editor.chain()` call sites to the command layer (`insertTemplate`, `replaceSelection`, `focusBlock`, `moveBlock`, table ops). `@tiptap/*` is out of dependencies (build-time guard). Frozen DOM/event contract per EDITOR-CONTRACT.md preserved; demo e2e 9/9 green. jade-garden migration is plan 020.
