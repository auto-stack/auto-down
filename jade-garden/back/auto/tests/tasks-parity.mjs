// TS-twin parity test for the generated task scanner (Plan 021 slice 3).
// Same fixtures asserted by the rust shell (../server/src/tasks.rs
// parse_tasks_parity_fixtures). Run: node tests/tasks-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/tasks_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { pages } = JSON.parse(readFileSync(join(here, 'tasks-fixtures.json'), 'utf8'))

for (const p of pages) {
  const items = m.parseTasksLines(p.pagePath, p.title, p.lines)
  assert.equal(items.length, p.expected.length, `page \`${p.pagePath}\`: task count`)
  items.forEach((it, i) => {
    const e = p.expected[i]
    assert.equal(it.marker, e.marker, `#${i} marker`)
    assert.equal(it.priority, e.priority, `#${i} priority`)
    assert.equal(it.content, e.content, `#${i} content`)
    assert.equal(it.scheduled, e.scheduled, `#${i} scheduled`)
    assert.equal(it.deadline, e.deadline, `#${i} deadline`)
    assert.equal(it.line, e.line, `#${i} line`)
    assert.equal(it.pagePath, p.pagePath, `#${i} pagePath`)
    assert.equal(it.title, p.title, `#${i} title`)
    assert.equal(it.raw, p.lines[e.line], `#${i} raw`)
  })
}

console.log(`tasks parity ok — ${pages.length} pages`)
