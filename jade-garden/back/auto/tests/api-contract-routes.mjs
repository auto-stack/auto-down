// Route-coverage check for the API contract (Plan 022 Phase 1).
//
// Asserts every route declared in back/server/src/main.rs has a matching
// `// ROUTE: <METHOD> <PATH>` marker in back/auto/api.at, so the contract
// cannot drift behind the route table (and a new route without a contract
// section fails here). Run: node tests/api-contract-routes.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const backDir = join(here, '..', '..')

const mainRs = readFileSync(join(backDir, 'server', 'src', 'main.rs'), 'utf8')
const apiAt = readFileSync(join(here, '..', 'api.at'), 'utf8')

// Axum 0.8 route lines: .route("/api/…", get(…)) / post(…)
const routeRe = /\.route\("([^"]+)",\s*(get|post)\(/
const routes = []
for (const line of mainRs.split('\n')) {
  const m = line.match(routeRe)
  if (m) routes.push({ method: m[2].toUpperCase(), path: m[1] })
}
assert.ok(routes.length >= 28, `expected the full route table, found ${routes.length}`)

const contractRoutes = new Set()
for (const line of apiAt.split('\n')) {
  // `// ROUTE: GET /api/…` — trailing annotations like `(body: …)` allowed
  const m = line.match(/^\/\/\s*ROUTE:\s*([A-Z]+)\s+(\S+)/)
  if (m) contractRoutes.add(`${m[1]} ${m[2]}`)
}

const missing = routes.filter(({ method, path }) => !contractRoutes.has(`${method} ${path}`))

assert.deepEqual(
  missing,
  [],
  `routes without a contract section in api.at:\n` +
    missing.map((r) => `  ${r.method} ${r.path}`).join('\n'),
)

console.log(`api contract routes ok — ${routes.length}/${routes.length} routes covered by api.at`)
