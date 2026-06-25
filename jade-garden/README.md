# Jade Garden

An Obsidian-like knowledge base editor built on top of AutoDown.

## Structure

```
jade-garden/
├── pac.at              # AutoUI workspace root
├── front/              # Main Vue frontend (Vite)
│   ├── pac.at          # AutoUI config (kept for API code generation)
│   ├── app.at          # AutoUI placeholder entry
│   ├── package.json    # Vite project manifest
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       └── assets/
└── back/
    ├── api.at          # AutoUI API definitions
    ├── db.at
    ├── service.at
    └── server/         # Rust Axum backend
        ├── Cargo.toml
        └── src/
```

## Development

### Frontend (Vite)

```bash
cd jade-garden/front
pnpm install   # first time only
pnpm dev       # http://localhost:3000
```

The frontend uses `@autodown/editor` and `@autodown/vue` via `link:` dependencies
pointing to `autodown/packages/editor` and `autodown/packages/vue`.

### Backend (Rust / Axum)

```bash
cd jade-garden/back/server
cargo run      # http://127.0.0.1:8080
```

The backend exposes:

- `GET/POST /api/workspace` — open or query the current wiki workspace
- `GET /api/files` — list the `wiki/` directory tree
- `POST /api/files/create|rename|delete` — file tree CRUD
- `GET/POST /api/wiki/{path}` — read/write `.ad` documents
- `GET /api/backlinks/{title}` / `/api/outlinks/{title}` — link graph

### API proxy

`vite.config.ts` proxies `/api` requests to `http://127.0.0.1:8080` by default,
so the frontend can call backend APIs without CORS issues.

## Integration with AutoDown

This editor embeds `@autodown/editor` for structured editing and
`@autodown/vue` for synchronized preview rendering of `.ad` files.
