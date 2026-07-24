# Plan: Replicate Logseq 0.10.15 / Obsidian-like capabilities in Jade Garden

## Context
- We have documented the current state in `docs/08-logseq-obsidian-feature-research.md`.
- The reference implementation is **Logseq 0.10.15** (`D:/github/logseq-0.10.15`), the last file-based release. It proves that a one-file-per-page Markdown model can support block IDs, block refs, embeds, `{{query}}`, tasks/SCHEDULED/repeaters, flashcards, whiteboards, and graph view without a database-as-source-of-truth.
- **Strategic decision (locked)**: stay file-model-first. Files are the source of truth; we add a persistent SQLite index for queries, backlinks, FTS, and block lookups.
- **Block anchor decision (locked)**: primary syntax is **Obsidian-style `^id`** (short readable anchor). Internally we also accept/emit Logseq-style `id:: <uuid>` for compatibility, mapping both to a stable UUID in the index.

## Goal
Deliver a sequence of milestones that turns Jade Garden from a "single WYSIWYG editor with backlinks and a graph" into a capable Obsidian-class local knowledge base, using Logseq 0.10.15 as the open-source reference.

## Current status
| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 — Block model + SQLite index | Done | Backend block/index architecture implemented. |
| M1 — Search, file tree, editable properties | Done | FTS, nested tree, properties panel integrated. |
| M2 — Block references and embeds | Done | `[[Page#^id]]`, block embeds, unlinked refs supported. |
| M3 — Daily notes, templates, command palette, recent files | Done | Daily notes, templates, command palette, recent files. |
| M4 — Rich content parity | Done | KaTeX, Mermaid, H4–H6, footnotes, asset drag/drop. |
| M5 — Tasks, scheduling, queries | Done | Task markers, scheduled/deadline, agenda, `{{query}}`. |
| M6 — Flashcards / SRS | Done | `#card` syntax, SM-5 scheduler, review UI. |
| M7 — Whiteboards, plugins, sync/publish | Done | Whiteboards, plugin architecture, import/export, sync placeholder. |

This plan is considered complete as of tag `jade-garden-v0.2`.

## Architectural pre-requisite (Milestone 0)
Before any advanced feature, we need a unified **Block Model** on both backend and frontend.

### Backend block model
- Location: `jade-garden/back/server/src/`.
- New modules:
  - `block.rs` — define `struct Block { uuid, page_path, block_id, kind, content, properties, ... }`.
  - `parser.rs` — parse `.ad` body into blocks (headings, list items, paragraphs, code blocks, blockquotes, callouts, details). Preserve source position and existing anchors.
  - `index.rs` — SQLite-backed persistent index replacing the in-memory `LinkIndex`.
- The index must store:
  - `pages` (path, title, frontmatter JSON, mtime).
  - `blocks` (uuid PRIMARY KEY, page_path, block_id UNIQUE, kind, content, properties JSON, line_start, line_end).
  - `links` (source_page, source_block_uuid?, target_page, target_block_uuid?, link_type: page|block|embed).
  - `tags` (page_path, tag_name, block_uuid?).
  - `fts_blocks` (FTS5 virtual table over block content for full-text search).
  - `fts_pages` (FTS5 over page title + frontmatter values).
- Existing `links.rs` is refactored to read from `index.rs`; `rebuild_index_sync` becomes "parse every file and upsert into SQLite", still triggered on startup/open workspace/write/rename/delete/file watcher.

### Frontend block model
- Location: `jade-garden/front/src/`.
- New stores/modules:
  - `stores/blocks.ts` — block cache keyed by `page_path` and by `uuid`, plus lookup by `block_id`.
  - `lib/blockParser.ts` — mirror of backend parser for editor needs (heading/outline extraction, anchor positions).
- Editor changes (`autodown/packages/editor/src/extensions/`):
  - Extend `BlockId.ts` so it can read existing `^id`/`id::` from the document and write them back on save.
  - Add command to "copy block link" (`[[Page#^id]]`).

### Anchor design detail
- When the user creates a block reference target, we generate a short readable `^id` (e.g. `^summary-3a7f`) and append it to the block line (Obsidian convention).
- If a block already has `id:: <uuid>`, we keep it in the file but also expose a `^id` alias in the UI/links.
- The SQLite index maps `block_id` → `uuid` and `uuid` → `block_id`/`page_path`. The `block_id` string is what appears in links; the `uuid` is the internal primary key.

---

## Milestone 1 — Search, file tree, and editable properties (P0)
**Why first**: these are the "daily usable" basics that currently have obvious gaps.

### 1.1 Editable Properties panel
- File: `jade-garden/front/src/components/PropertiesPanel.vue`.
- Make frontmatter editable inline: text, number, boolean toggle, date picker, list editor.
- Save via existing `writeWiki` API; backend preserves YAML round-trip.
- Acceptance: user can edit `status`, `tags`, `summary` in the right sidebar and see them written back to `.ad`.

### 1.2 Full-text search backend
- File: `jade-garden/back/server/src/search.rs` (new).
- Add SQLite FTS5 with trigram tokenizer (`rusqlite` feature if available; otherwise use `simple` + LIKE fallback).
- Endpoints:
  - `GET /api/search?q=...&limit=20` returning unified results: pages, blocks, with highlighted snippets.
  - `GET /api/search/pages?q=...` for quick switcher.
  - `GET /api/search/blocks?q=...` for block embed lookup.
- Incremental index updates on file save/rename/delete/watcher.
- Acceptance: searching Chinese characters returns sub-string matches; results show title + snippet.

### 1.3 File tree fixes
- Backend: `jade-garden/back/server/src/files.rs` — return true nested `children` for `recursive=true`.
- Frontend: `jade-garden/front/src/components/FileTree*.vue` — render nested tree; add context menu (right-click) with New file, New folder, Rename, Delete, Duplicate.
- Acceptance: nested directories display correctly; right-click rename updates file and all backlinks.

### 1.4 Outline click-to-scroll + heading anchors
- Frontend: `jade-garden/front/src/components/OutlinePanel.vue`.
- Backend parser provides heading line ranges; frontend scrolls editor to the heading node.
- Support `[[Page#Heading]]` by resolving heading text to block anchor and opening at that position.
- Acceptance: clicking a heading in the outline scrolls to it; opening `[[Page#Heading]]` jumps to heading.

---

## Milestone 2 — Block references and embeds (P1)
**Reference**: Logseq 0.10.15 `deps/graph-parser/src/logseq/graph_parser/block.cljs` and `src/main/frontend/components/block.cljs`.

### 2.1 Backend: block anchor persistence
- When saving a `.ad` file, parser detects headings/list items without an anchor and assigns one if the block is referenced anywhere.
- Writes `^id` at end of block line (Obsidian) and/or keeps existing `id:: <uuid>` (Logseq).
- Index updates `blocks` and `links` tables.

### 2.2 Frontend: `[[Page#^id]]` support
- Extend `WikiLink.ts` to parse `[[Title#blockId]]` where `blockId` can be `^id` or raw id.
- On click, resolve via `/api/blocks/{uuid_or_block_id}` and scroll to the block.
- Render embedded references: `![[Page#^id]]` shows the referenced block content inline (read-only).

### 2.3 Block link creation UX
- Block hover menu: "Copy block link" generates `[[CurrentPage#^id]]` to clipboard.
- Slash command `/block link` or right-click block to assign anchor.

### 2.4 Unlinked references + aliases
- Add alias support: frontmatter `aliases: ["Alt Name"]`.
- "Unlinked references" panel: find occurrences of page title or alias in plain text not wrapped in `[[...]]`.
- Acceptance: block refs survive file edits and round-trip correctly; unlinked refs panel works.

---

## Milestone 3 — Daily notes, templates, command palette, recent files (P1)
**Reference**: Logseq 0.10.15 `src/main/frontend/date.cljs`, `src/main/frontend/handler/journal.cljs`, `src/main/frontend/template.cljs`.

### 3.1 Daily notes
- Config keys: `:journal/file-name-format` (default `yyyy_MM_dd`), `:journal/page-title-format` (default `MMM do, yyyy`).
- Ribbon button / shortcut for "Open today's note".
- Auto-create `journals/yyyy_MM_dd.ad` with template content.
- "Previous / next day" navigation in tab or toolbar.

### 3.2 Templates
- Designate a `templates/` directory or tag `#template`.
- Template syntax `<% today %>`, `<% yesterday %>`, `<% time %>`, `<% current page %>`.
- Slash command `/template` to insert.
- Acceptance: inserting a template replaces variables with current date/page links.

### 3.3 Command palette + recent files
- New component `jade-garden/front/src/components/CommandPalette.vue` bound to `Cmd/Ctrl+P`.
- Commands: open file, open today, open graph, toggle theme, toggle sidebar, etc.
- Recent files store in `localStorage`; surfaced in palette and a "Recent" sidebar panel.

---

## Milestone 4 — Rich content parity (P1)
### 4.1 Editor KaTeX rendering
- Enable live KaTeX preview for `$...$` and `$$...$$` in the editor.
- Reference: existing `CustomMathBlock.ts` but render inline via `katex` in a Tiptap node view.

### 4.2 Editor Mermaid rendering
- Add a Tiptap node view for `language: 'mermaid'` code blocks that renders with `mermaid`.

### 4.3 H4–H6 and footnotes
- Extend `StarterKit` heading levels to 1–6.
- Add footnote extension/parser for `[^1]`/`[^1]:`.

### 4.4 Asset drag/drop
- Drag image into editor → save to `assets/` with timestamped filename, insert `![alt](../assets/...)`.
- Backend endpoint `POST /api/assets/upload`.

---

## Milestone 5 — Tasks, scheduling, queries (P2)
**Reference**: Logseq 0.10.15 `frontend.util.marker`, `frontend.handler.editor/cycle-todo!`, `frontend.handler.repeated`, `frontend.db.query-dsl`.

### 5.1 Task markers
- Syntax: `- TODO ...`, `- DOING ...`, `- DONE ...`, `- NOW ...`, `- LATER ...`.
- `Cmd/Ctrl+Enter` cycles state based on config `:preferred-workflow` (`:todo` or `:now`).
- Priorities `[#A] [#B] [#C]`.

### 5.2 SCHEDULED / DEADLINE / repeaters
- Lines: `SCHEDULED: <2026-07-01 Wed>` and `DEADLINE: <2026-07-05 Sun>`.
- Repeater: `<... +1w>`, `<... .+1d>`, `<... ++1m>`.
- On marking DONE, update the scheduled/deadline line to next occurrence and reset marker to TODO/LATER.

### 5.3 Agenda view
- New panel or tab: "Agenda" lists tasks with scheduled/deadline from today forward, grouped by date.

### 5.4 `{{query ...}}` macros
- Parse `{{query ...}}` in editor; render results as list/table.
- DSL subset: `[[Page]]`, `#tag`, `(and/or/not)`, `(task TODO DOING)`, `(priority A B)`, `(between -7d +7d)`, `(property key value)`.
- Execute against SQLite index; no DataScript needed.

---

## Milestone 6 — Flashcards / SRS (P2)
**Reference**: Logseq 0.10.15 `src/main/frontend/extensions/srs/` (SM-5).

### 6.1 Card syntax
- `#card` tag or `[[card]]` reference marks a block as a card.
- Cloze: `{{cloze answer \ hint}}`.
- Deck macro: `{{cards [[Deck]]}}`.

### 6.2 SM-5 scheduler
- Store per-card state in block properties: `card-ease-factor`, `card-repeats`, `card-last-interval`, `card-next-schedule`, `card-last-score`, `card-last-reviewed`.
- Store global OF-Matrix in `jade-garden/srs-of-matrix.edn`.

### 6.3 Review UI
- Modal with card question → show answer → rate Again/Hard/Good/Easy (1/2/3/4).
- Update block properties and matrix on rating.

---

## Milestone 7 — Whiteboards, plugins, sync/publish (P3)
### 7.1 Whiteboards
- Directory `whiteboards/`; file format `.edn` with tldraw shape data.
- New tab type for `.canvas`/`.edn` whiteboard; render with tldraw SDK.
- Portal shapes link to pages/blocks.

### 7.2 Plugin system (architecture only)
- Sandboxed iframes + `postMessage` RPC.
- Host registries for slash commands, command palette items, UI injections, fenced code renderers.
- Plugin API surface: App, Editor, UI, Assets (file-model subset).

### 7.3 Import / export / publish
- Import: Markdown directory, Roam JSON, Logseq EDN/JSON, OPML.
- Export: Markdown, HTML (public pages), EDN, OPML.
- Publish: static-site generation of public pages.

### 7.4 Sync
- File-level sync via git or external drive first.
- Real-time collaboration is explicitly out of scope unless we later switch to a block database.

---

## Files to create / modify (summary)

### New backend files
- `jade-garden/back/server/src/block.rs`
- `jade-garden/back/server/src/parser.rs`
- `jade-garden/back/server/src/index.rs`
- `jade-garden/back/server/src/search.rs`
- `jade-garden/back/server/src/assets.rs`

### Modified backend files
- `jade-garden/back/server/src/main.rs` — add routes.
- `jade-garden/back/server/src/state.rs` — replace `LinkIndex` with SQLite connection.
- `jade-garden/back/server/src/links.rs` — read from index.
- `jade-garden/back/server/src/wiki.rs` — trigger incremental index update.
- `jade-garden/back/server/src/files.rs` — nested tree, asset upload route.

### New frontend files
- `jade-garden/front/src/stores/blocks.ts`
- `jade-garden/front/src/lib/blockParser.ts`
- `jade-garden/front/src/components/CommandPalette.vue`
- `jade-garden/front/src/components/AgendaView.vue`
- `jade-garden/front/src/components/FlashcardModal.vue`
- `jade-garden/front/src/components/UnlinkedReferencesPanel.vue`

### Modified frontend files
- `jade-garden/front/src/components/PropertiesPanel.vue` — editable.
- `jade-garden/front/src/components/OutlinePanel.vue` — click-to-scroll.
- `jade-garden/front/src/components/FileTree.vue`, `FileTreeNode.vue` — nested + context menu.
- `jade-garden/front/src/components/SearchPanel.vue` — full-text.
- `jade-garden/front/src/components/MainArea.vue` — embed blocks, whiteboard tab.
- `jade-garden/front/src/components/Ribbon.vue` — daily note button.
- `jade-garden/front/src/lib/api.ts` — new endpoints.

### Editor package changes
- `autodown/packages/editor/src/extensions/BlockId.ts` — persistent anchors.
- `autodown/packages/editor/src/extensions/WikiLink.ts` — block embed, `[[Page#^id]]`.
- `autodown/packages/editor/src/extensions/CustomMathBlock.ts` — live KaTeX.
- New `autodown/packages/editor/src/extensions/MermaidBlock.ts`.
- New `autodown/packages/editor/src/extensions/Footnote.ts`.
- `autodown/packages/editor/src/menus/SlashMenu.vue` — add block link, template, task, card commands.

---

## Recommended execution order
1. **Milestone 0** must be done before any P1/P2 feature.
2. **Milestone 1** can start in parallel with M0 once the index schema is stable.
3. **Milestone 2** immediately after M0.
4. **Milestones 3–4** in parallel; they are mostly UI/editor work.
5. **Milestone 5** after task marker editor support is solid.
6. **Milestone 6** can follow 5 or run in parallel.
7. **Milestone 7** is explicitly last and may be split into separate plans.

## Acceptance criteria for the overall plan
- After Milestone 2: a user can create a block anchor `^id`, copy `[[Page#^id]]`, paste it elsewhere, click it, and land at the anchored block after round-trip save.
- After Milestone 5: a user can write `- TODO [#A] review paper SCHEDULED: <2026-07-01 Tue +1w>`, cycle it, and see it in an agenda view.
- After Milestone 6: a user can mark a block `#card` and review it with SM-5 scheduling.
