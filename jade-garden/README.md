# Jade Garden

An Obsidian-like knowledge base editor built on top of AutoDown.

## Structure

```
jade-garden/
├── pac.at              # Workspace root
├── front/              # AutoUI frontend
│   ├── pac.at
│   └── app.at
└── back/               # Rust backend
    ├── pac.at
    ├── api.at
    ├── db.at
    └── service.at
```

## Development

```bash
cd jade-garden
auto run      # Generate Vue + Rust code and start the dev server
```

- Default mode: Vue SPA + Rust HTTP backend (`axum`).
  - Frontend: http://localhost:3000
  - Backend:  http://127.0.0.1:8080
- Tauri mode: change `front/pac.at` to `backend: "tauri"` and run `auto run`.

## Integration with AutoDown

This editor will embed `@autodown/editor` for structured editing and
`@autodown/vue` for synchronized preview rendering of `.ad` files.
