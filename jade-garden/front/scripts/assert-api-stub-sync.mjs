// assert-api-stub-sync.mjs — drift guard for the gen-tree api stub mirror.
//
// The gen project (auto/gen, gitignored) typechecks against a hand-maintained
// mirror of the wire contract: auto/stubs/gen_lib_api.ts. The real contract
// is src/lib/api_gen.ts (generated from back/auto/api.at). These two drifted
// once — the backend Option-ization (T -> T | null) never reached the stub,
// and the gen vue-tsc gate stayed red on agenda TS2322 + adoptSaveResult
// TS2305 until the debt was paid (2026-08-30). This guard keeps that class
// of drift from coming back, in three checks:
//
//   A. stub entities vs api_gen.ts entities: field SETS, types AND
//      optionality (`?`) must match exactly for every entity present in
//      both. (The stub intentionally prunes whole entities; the ones it
//      mirrors must be faithful.)
//   B. when the gen tree exists: every `@/lib/api` / `*src/lib/api` import
//      in gen must resolve against the stub's exports.
//   C. when the gen tree exists: both deployed api positions must be
//      byte-identical to the stub — gen src/lib/api.ts (serves `@/lib/api`
//      alias consumers such as generated components) and gen src/src/lib/
//      api.ts (the verbatim exts live under src/ext/ one level deeper, so
//      their shared relative import `../../../../src/lib/api` resolves
//      there). Neither position is an orphan; cp the stub to BOTH after
//      every stub edit.
//
// Wired into scripts/e2e-prepare.mjs (pretest:e2e). Static and fast — no
// gen build is triggered.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUB = path.join(frontDir, 'auto', 'stubs', 'gen_lib_api.ts')
const REAL = path.join(frontDir, 'src', 'lib', 'api_gen.ts')
const GEN_SRC = path.join(frontDir, 'auto', 'gen', 'front', 'vue', 'src')

function entitiesOf(file) {
  const s = fs.readFileSync(file, 'utf-8')
  const out = new Map()
  for (const m of s.matchAll(/export (?:class|interface) (\w+) \{([^}]*)\}/g)) {
    const fields = new Map()
    for (const line of m[2].split('\n')) {
      const fm = line.trim().match(/^(\w+)(\??):\s*([^;]+?);?$/)
      if (fm) fields.set(fm[1], (fm[2] ? '?' : '') + fm[3].trim())
    }
    out.set(m[1], fields)
  }
  return out
}

function exportsOf(file) {
  const names = new Set()
  for (const m of fs.readFileSync(file, 'utf-8').matchAll(
    /export (?:abstract )?(?:async )?(?:class|interface|function|const|let) (\w+)/g,
  )) {
    names.add(m[1])
  }
  return names
}

const problems = []

// A. entity mirror fidelity (stub side drives: pruned entities are fine)
const real = entitiesOf(REAL)
const stub = entitiesOf(STUB)
for (const name of [...stub.keys()].sort()) {
  if (!real.has(name)) continue
  const r = real.get(name)
  const t = stub.get(name)
  for (const f of new Set([...r.keys(), ...t.keys()])) {
    if (r.get(f) !== t.get(f)) {
      problems.push(`A: ${name}.${f}: api_gen=${r.get(f) ?? '(missing)'} stub=${t.get(f) ?? '(missing)'}`)
    }
  }
}

// B + C. gen-tree checks (best effort — gen is gitignored scratch)
if (fs.existsSync(GEN_SRC)) {
  const stubExports = exportsOf(STUB)
  const imported = new Map()
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|vue)$/.test(e.name)) {
        // skip the deployed api copies themselves — they ARE the mirror, and
        // their doc comments quote import statements (`import { ... } from
        // '@/lib/api'`) that would register as phantom consumers
        if (/(^|[/\\])lib[/\\]api\.ts$/.test(p)) continue
        const s = fs.readFileSync(p, 'utf-8')
        for (const m of s.matchAll(/import\s+\{([^}]*)\}\s+from\s+['"][^'"]*lib\/api['"]/g)) {
          for (const raw of m[1].split(',')) {
            const n = raw.trim().replace(/^type\s+/, '')
            const local = n.includes(' as ') ? n.split(' as ').pop().trim() : n
            if (/^[\w$]+$/.test(local) && !imported.has(local)) {
              imported.set(local, path.relative(frontDir, p))
            }
          }
        }
      }
    }
  }
  walk(GEN_SRC)
  for (const [name, from] of [...imported.entries()].sort()) {
    if (!stubExports.has(name)) {
      problems.push(`B: gen imports { ${name} } from lib/api (${from}) but the stub does not export it`)
    }
  }

  const stubText = fs.readFileSync(STUB, 'utf-8')
  for (const rel of ['lib/api.ts', path.join('src', 'lib', 'api.ts')]) {
    const p = path.join(GEN_SRC, rel)
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf-8') !== stubText) {
      problems.push(`C: ${path.relative(frontDir, p)} differs from auto/stubs/gen_lib_api.ts — cp the stub to BOTH positions after stub edits`)
    }
  }
} else {
  console.log('[assert-api-stub-sync] gen tree absent — B/C skipped (a regen re-checks)')
}

if (problems.length > 0) {
  console.error('[assert-api-stub-sync] FAILED — api stub mirror drifted:')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log(
  '[assert-api-stub-sync] ok — stub mirrors api_gen.ts' +
    (fs.existsSync(GEN_SRC) ? ' (gen imports resolve, both deployed copies in sync)' : ''),
)
