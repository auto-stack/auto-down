// TS-twin parity test for the generated query evaluator (Plan 021 slice 3).
// Same fixtures asserted by the rust shell (../server/src/query.rs
// query_gen_parity_fixtures). Run: node tests/query-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/query_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { cases } = JSON.parse(readFileSync(join(here, 'query-fixtures.json'), 'utf8'))

for (const c of cases) {
  const out = m.evalQuery(c.query, c.task, c.today)
  assert.equal(out.ok, c.err === '', `case \`${c.query}\`: ok flag`)
  if (c.err !== '') {
    assert.ok(out.err.includes(c.err), `case \`${c.query}\`: err — got "${out.err}", want substr "${c.err}"`)
  } else {
    assert.equal(out.err, '', `case \`${c.query}\`: err should be empty`)
    assert.equal(out.value, c.value, `case \`${c.query}\`: value`)
  }
}

console.log(`query parity ok — ${cases.length} cases`)
