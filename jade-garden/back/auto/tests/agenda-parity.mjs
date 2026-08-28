// TS-twin parity test for the agenda module (Plan 022 slice 4).
// Same fixtures asserted by the rust shell (../server/src/tasks.rs
// agenda_gen_parity_fixtures). Run: node tests/agenda-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/agenda_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(readFileSync(join(here, 'agenda-fixtures.json'), 'utf8'))

for (const d of fx.dates) {
  assert.equal(m.normalizeDate(d.raw), d.out, `normalizeDate(${JSON.stringify(d.raw)})`)
}

for (const g of fx.groups) {
  const groups = m.groupAgenda(g.entries, g.today, g.end)
  assert.equal(groups.length, g.expected.length, `${g.name}: group count`)
  groups.forEach((grp, i) => {
    const e = g.expected[i]
    assert.equal(grp.date, e.date, `${g.name} #${i} date`)
    assert.deepEqual(grp.indexes, e.indexes, `${g.name} #${i} indexes`)
  })
}

console.log(`agenda parity ok — ${fx.dates.length} dates, ${fx.groups.length} group cases`)
