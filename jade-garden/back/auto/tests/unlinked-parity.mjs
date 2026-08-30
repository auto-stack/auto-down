// TS-twin parity test for the generated unlinked module (plan-022 Phase 5).
//
// Runs the SAME fixtures the rust shell asserts (../server/src/unlinked.rs
// unlinked_gen_parity_fixtures) through the a2ts emission, so both targets
// are pinned to one fixture file. Run: node tests/unlinked-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/unlinked_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { cases } = JSON.parse(readFileSync(join(here, 'unlinked-fixtures.json'), 'utf8'))

for (const c of cases) {
  const hits = m.findUnlinkedRefs(c.text, c.names)
  assert.equal(
    hits.length,
    c.expected.length,
    `case \`${c.name}\`: hit count (${JSON.stringify(hits)})`,
  )
  hits.forEach((h, i) => {
    const e = c.expected[i]
    const label = `case \`${c.name}\` #${i}`
    assert.equal(h.matched, e.matched, `${label}: matched`)
    assert.equal(h.context, e.context, `${label}: context`)
  })
}

console.log(`unlinked parity ok — ${cases.length} cases`)
