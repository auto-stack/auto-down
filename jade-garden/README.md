# Jade Garden

An Obsidian-like knowledge base editor built on AutoDown — with two runtime
forms from one source tree: the **web app** (Vue + Vite, axum or in-VM
backend) and the **desktop app** (AutoVM + iced native window).

## Structure

```
jade-garden/
├── back/
│   ├── auto/               # .at single sources (the logic home)
│   │   ├── api.at          # /api/* contract: types + ROUTE markers + #[api] fns
│   │   ├── parser.at       # block segmentation / anchor split / properties
│   │   ├── links.at        # wikilink / block-ref / tag scanning
│   │   ├── search.at       # search matching / snippet / ranking
│   │   ├── tasks.at / agenda.at / query.at / srs.at
│   │   ├── unlinked.at     # unlinked-reference scan
│   │   ├── linkgraph.at    # backlink/outlink/graph assembly + degrees
│   │   ├── server.at       # VM-mode server entry (JADE_GARDEN_SERVER=vm)
│   │   ├── jade_server.at  # 28-route VM server (442-c2 adapter)
│   │   ├── gen.mjs         # dual-emission: a2ts + a2r + deployments
│   │   └── tests/          # parity/contract gates (node)
│   └── server/             # Rust axum shells over the *_gen modules
│       └── src/            # (logic lives in the .at sources above)
├── front/
│   ├── auto/               # front .at single sources
│   │   ├── pac.at          # front project config (render: vue)
│   │   ├── src/front/      # 29 widget .at + 9 store .at + ext helpers
│   │   └── gen/front/vue/  # generated Vue project (a2ts output)
│   ├── desktop/            # desktop form: VM-rendered iced app (plan 022)
│   │   ├── pac.at / src/front/app.at
│   │   ├── src/back/api.at # contract copy (GENERATED via gen.mjs)
│   │   ├── baseline/       # structure visual baseline
│   │   └── README.md       # Phase 4/5 decisions, rulings, slice log
│   ├── src/                # deployed web app (facade stores + components)
│   └── e2e/                # playwright specs (23, dual-backend)
└── legacy-autoui/          # archived plan-011 toolchain (seeds only)
```

## The two runtime forms

| | Web | Desktop |
| --- | --- | --- |
| UI runtime | Vue 3 + Vite (DOM) | AutoVM + iced native window |
| Widgets | 29 `.at` → a2ts → Vue SFCs | the same widget DSL interpreted by the VM renderer |
| Backend | rust axum shells, or the VM server (`JADE_GARDEN_SERVER=vm`) | rust server over loopback HTTP, or the VM server in-process |
| Status | primary (e2e 23/23, dual-backend) | plan-022 Phase 4/5: core flows verified |

Both forms read the same `/api/*` contract (`back/auto/api.at`) and the same
`.at` logic sources.

## Development

### Web frontend

```bash
cd jade-garden/front
pnpm install        # first time
pnpm dev            # http://localhost:3000 (proxies /api → :8080)
pnpm build          # vue-tsc + vite build (client-drift gate)
pnpm test:e2e       # playwright, 23 specs
JADE_GARDEN_SERVER=vm pnpm test:e2e   # same 23 specs on the VM backend
```

### Backend (Rust / Axum)

```bash
cd jade-garden/back/server
cargo run           # 127.0.0.1:8080
cargo test          # unit + cross-language parity fixtures
```

The axum layer is thin shells (`*_impl` + route fns); the logic lives in the
`.at` single sources and reaches the shell through the emitted `*_gen.rs`
modules (`node gen.mjs` in `back/auto` regenerates everything).

### Desktop (VM / iced)

```bash
cd jade-garden/front/desktop
AUTO_VM_MERGE=0 AUTO_BACKEND=http://127.0.0.1:8199 \
  D:/autostack/auto-lang/target/debug/auto.exe run -r vm
```

See `front/desktop/README.md` for the runtime matrix, the import/export
native route, and the Phase 4/5 slice log.

## Regenerating the single sources

```bash
cd jade-garden/back/auto
node gen.mjs        # a2ts + a2r for parser/links/tasks/query/agenda/srs/
                    # search/unlinked/linkgraph + api.at deployments
node tests/api-contract-routes.mjs   # contract gate (routes ↔ #[api] ↔ copies)
```

Contract change process: backend DTO first → mirror in `api.at` (type +
ROUTE marker + `#[api]` fn) → `node gen.mjs` → api.ts follows → `pnpm build`
fails on client drift → the gate fails on registration drift.

## Engine (AutoDown)

The front consumes `@autodown/engine` (link: `autodown/packages/engine`) for
the editor, markdown rendering, and — since plan-022 Phase 5 — the block
parse for the blocks/outline stores (`@autodown/engine/parser`).

See `docs/plans/022-vm-desktop-auto-libs.md` (plan), `DEBTS.md` (ledger), and
`ARCHITECTURE.md` (design doc).
