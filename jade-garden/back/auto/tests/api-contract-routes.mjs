// Route-coverage check for the API contract (Plan 022 Phase 1, slice 2).
//
// Asserts:
//   1. every route declared in back/server/src/main.rs has a matching
//      `// ROUTE: <METHOD> <PATH>` marker in back/auto/api.at (Phase 1),
//   2. the `#[api(method, path)]` fn layer (Phase 4 slice 2, Plan 340
//      rewrite metadata) and the ROUTE markers agree on every JSON route;
//      the multipart/binary routes that cannot pass the VM envelope
//      (Phase 3 D4) are exempt and must NOT carry an #[api] fn.
// Run: node tests/api-contract-routes.mjs

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

// ---- slice 2: #[api] fn layer ↔ ROUTE markers dual registration ----

// Routes that cannot pass the VM dispatch envelope (Phase 3 D4 deviation):
// multipart request bodies and binary (zip) responses. Explicit list —
// a route outside this set without an #[api] fn fails the gate.
const VM_ENVELOPE_EXEMPT = new Set([
  'POST /api/assets/upload',
  'GET /api/export/markdown',
  'POST /api/import/markdown',
])

const apiFns = new Map() // "METHOD path" -> fn name
for (const line of apiAt.split('\n')) {
  const m = line.match(/^#\[api\(method\s*=\s*"([A-Z]+)"\s*,\s*path\s*=\s*"([^"]+)"\)\]/)
  if (m) {
    const key = `${m[1]} ${m[2]}`
    assert.ok(
      !apiFns.has(key),
      `duplicate #[api] fn for ${key} (already on ${apiFns.get(key)})`,
    )
    apiFns.set(key, line)
  }
}

for (const key of apiFns.keys()) {
  assert.ok(
    contractRoutes.has(key),
    `#[api] fn ${key} has no ROUTE marker in api.at — dual registration broken`,
  )
}

const jsonRoutes = [...contractRoutes].filter((k) => !VM_ENVELOPE_EXEMPT.has(k))
const uncovered = jsonRoutes.filter((k) => !apiFns.has(k))
assert.deepEqual(
  uncovered,
  [],
  `JSON routes without an #[api] fn (add one; if the route cannot pass the ` +
    `VM envelope, add it to VM_ENVELOPE_EXEMPT with rationale):\n` +
    uncovered.map((k) => `  ${k}`).join('\n'),
)

const exemptWithFn = [...apiFns.keys()].filter((k) => VM_ENVELOPE_EXEMPT.has(k))
assert.deepEqual(
  exemptWithFn,
  [],
  `#[api] fns declared for VM-envelope-exempt routes (multipart/binary):\n` +
    exemptWithFn.map((k) => `  ${k}`).join('\n'),
)

console.log(
  `api contract routes ok — ${routes.length}/${routes.length} routes covered by api.at; ` +
    `${apiFns.size} #[api] fns consistent (${VM_ENVELOPE_EXEMPT.size} VM-envelope exemptions)`,
)

// ---- slice 3: desktop VM contract copy drift check ----
// gen.mjs deploys the contract .at (verbatim) to front/desktop/src/back/api.at
// for the desktop app's `use back.api:` resolution. Assert it exists and is
// byte-identical to the source (modulo the GENERATED header).

const desktopCopy = join(backDir, '..', 'front', 'desktop', 'src', 'back', 'api.at')
let copyBody = null
try {
  copyBody = readFileSync(desktopCopy, 'utf8')
} catch {
  assert.fail(
    `desktop contract copy missing at ${desktopCopy} — run \`node gen.mjs\` in back/auto to deploy it`,
  )
}
const copyLines = copyBody.split('\n')
const bodyStart = copyLines.findIndex((l) => !l.startsWith('//') && l.trim() !== '')
const srcBody = apiAt.split('\n')
const srcStart = srcBody.findIndex((l) => !l.startsWith('//') && l.trim() !== '')
assert.deepEqual(
  copyLines.slice(bodyStart).join('\n'),
  srcBody.slice(srcStart).join('\n'),
  `desktop contract copy drifted from back/auto/api.at — run \`node gen.mjs\` to re-deploy`,
)
console.log('desktop contract copy ok — byte-identical to back/auto/api.at')
