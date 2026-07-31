# Jade Garden E2E baseline (Playwright)

This suite is the **behavior + pixel baseline** that guards the plan-011
migration of `front/` components to Auto. It must be 100% green before any
migration starts, and after every migrated component.

## Run

```bash
cd jade-garden/front
pnpm test:e2e          # full suite (prepares runtime, starts back+front, runs)
pnpm test:e2e:update   # regenerate screenshot baselines (after INTENTIONAL visual changes only)
```

Prerequisites: `cargo build` once in `jade-garden/back/server` (the suite runs
the debug binary) and `pnpm install` in `front/`.

## Architecture

- `scripts/e2e-prepare.mjs` (runs via `pretest:e2e` hook) creates an isolated
  runtime under `front/e2e/.runtime/` (gitignored):
  - a copy of `back/server/target/debug/jade-garden-back.exe` — its config file
    (`jade-garden-config.json`, stored next to the exe) therefore lives inside
    `.runtime/` and never touches your dev setup;
  - a **fresh copy** of `tmp/wiki-demo/wiki` as the test workspace, so tests may
    type/save freely without polluting `tmp/wiki-demo`.
- `playwright.config.ts` starts both servers as Playwright `webServer`s:
  backend on `127.0.0.1:18181`, vite dev on `127.0.0.1:13100`
  (`AUTO_HTTP_PROXY` points the vite `/api` proxy at the test backend).
  Dedicated ports avoid clashing with a running dev environment (3000/8080).
- Tests run serially (`workers: 1`) because they share one backend + one
  workspace. `retries: 1` absorbs occasional local browser-launch flakiness.

## Scenario coverage (plan 011, Phase 5.0c)

| Plan scenario | Spec | Notes |
|---|---|---|
| Workspace open + file tree | `01-workspace.spec.ts` | Both the auto-load path and the `WorkspaceOpener` UI (via API-route interception that forces "no workspace"). |
| Editor renders .ad; typing → debounced save | `02-editor.spec.ts` | Save (2 s debounce) is verified through `GET /api/wiki/:path`, not sleeps. |
| Multi-tab keep-alive (v-show contract) | `03-tabs.spec.ts` | Types in tab A, round-trips A→B→A→B→A, asserts both editors stay mounted (`.autodown-editor` count = 2) and content persists. |
| Wiki link click navigates | `04-wikilink.spec.ts` | Existing link opens the file tab; dangling link ([[首页]] in Projects.ad) triggers the create-page confirm (dialog auto-accepted) and opens the new tab. |
| Right sidebar panels | `05-panels.spec.ts` | See mapping caveats below. |
| Ctrl+P / Ctrl+O modals | `06-palette.spec.ts` | Ctrl+P = CommandPalette (commands), Ctrl+O = QuickSwitcher (file search). Also covers the Flashcards modal via the palette command. |
| Graph view mounts cytoscape | `07-graph.spec.ts` | Asserts `.graph-view canvas` + sidebar stats, not canvas pixels. |
| Screenshot baselines | `08-screenshots.spec.ts` | Main layout, editor area, and each right-sidebar panel. Baselines in `08-screenshots.spec.ts-snapshots/`. |

## Mapping caveats vs the plan's panel list

The plan asks for Outline / Backlinks / Tags / Tasks / Flashcards / Bookmarks.
The app actually has: **Agenda, Outline, Backlinks, Outgoing links, Unlinked
References, Properties** (right sidebar) plus Search/Recent (left sidebar).

- **Tags, Bookmarks**: no such panels exist in the app — nothing to test.
- **Tasks**: closest is `AgendaPanel` (covered). The fixture tasks have no
  scheduled/deadline dates, so it renders its `No upcoming tasks` empty state.
- **Flashcards**: a modal, not a panel; the fixture contains no flashcards, so
  the modal's `No cards due for review` empty state is asserted instead.

## Known app-side gaps pinned by this baseline

- **OutlinePanel is always empty.** Nothing in the app ever calls
  `blocks.parse`, so the blocks store stays empty and the panel renders
  `No headings.` even for documents with headings. `05-panels.spec.ts` pins
  this current behavior; if the app is fixed, update the test and the
  `panel-outline.png` baseline deliberately.

## Deliberately NOT covered (and why)

- **Graph canvas pixels**: cytoscape-fcose layout is nondeterministic across
  runs, so graph screenshots would be flaky. DOM-level assertions only.
- **File-tree CRUD via context menu**: the app drives create/rename/delete
  through native `window.prompt`/`confirm`; covered implicitly by the
  dangling-wiki-link create-page flow instead.
- **Whiteboard (.canvas files)**: the fixture workspace has none.

## Flakiness policy

- Waits are selector/API-based (`expect.poll` on the REST API for saves,
  visibility waits everywhere else) — no fixed `waitForTimeout` in specs.
- Screenshot config: fixed 1440×900 viewport, `animations: 'disabled'`,
  `caret: 'hide'`, `maxDiffPixelRatio: 0.02`. Mouse is parked over the status
  bar before each screenshot to avoid hover-state pixels.
- If a screenshot test fails after an intentional visual change, regenerate
  with `pnpm test:e2e:update` and review the diff in the commit.

## For migration agents

- Everything here is additive; no app source is touched. Do not "fix" tests to
  match new behavior without an explicit product decision — the baseline pins
  current behavior, including quirks (see Outline above).
- The suite takes ~1–2 minutes. Run it after every migrated component.
