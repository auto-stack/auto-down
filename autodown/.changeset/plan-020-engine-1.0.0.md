---
'@autodown/engine': major
---

plan 020: engine **1.0.0** — contract freeze. Consumers migrated to the
single engine package: demo (Phase 2) and jade-garden (Phase 3) consume
`@autodown/engine` directly; `@autodown/core` / `@autodown/vue` /
`@autodown/editor` are deprecated re-export shims (retirement ruling in the
plan; DEBTS.md 020 row tracks physical archival). New in this line: editor
preview wikilinks — `[[title]]` / `[[title#block]]` render as clickable
`.autodown-wikilink-label` spans emitting `open-wiki-link(title, blockId)`
(the plan-018 frozen selector, now honored by the self-built kernel). Freeze
scope: the four exits (`.`/`./parser`/`./render`/`./editor` + style.css),
the EDITOR-CONTRACT.md DOM/event surface, and the command-layer API
(`insertTemplate`, `replaceSelection`, `focusBlock`, `moveBlock`,
`setBlockAttrs`, table ops). The rust/VM platform surface (a2r crate, VM
natives) is explicitly **experimental** — not frozen at 1.0.0. Release
channel: vendor snapshot (no npm publish; workspace/publish prerequisites
stay registered in DEBTS.md).
