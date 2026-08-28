// TS-twin parity test for the srs module (Plan 022 slice 4).
// Same fixtures asserted by the rust shell (../server/src/srs.rs
// srs_gen_parity_fixtures). Run: node tests/srs-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/srs_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(readFileSync(join(here, 'srs-fixtures.json'), 'utf8'))

const DEFAULT_MATRIX = () =>
  Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 2.5))

// -- buildQa ------------------------------------------------------------------
for (const c of fx.qa) {
  const qa = m.buildQa(c.content)
  assert.equal(qa.question, c.q, `${c.name}: question`)
  assert.equal(qa.answer, c.a, `${c.name}: answer`)
}

// -- parseBlockProps ----------------------------------------------------------
for (const c of fx.props) {
  const got = m.parseBlockProps(c.lines, c.lineStart, c.lineEnd)
  assert.equal(got.length, Object.keys(c.expected).length, `${c.name}: prop count`)
  for (const p of got) {
    assert.equal(p.value, c.expected[p.key], `${c.name}: ${p.key}`)
  }
}

// -- extractCards -------------------------------------------------------------
for (const c of fx.extract) {
  const cards = m.extractCards(c.pagePath, c.lines, c.blocks)
  assert.equal(cards.length, c.expected.length, `${c.name}: card count`)
  cards.forEach((card, i) => {
    const e = c.expected[i]
    assert.equal(card.blockId, e.blockId, `${c.name} #${i} blockId`)
    assert.equal(card.uuid, c.blocks.find((b) => b.blockId === e.blockId).uuid)
    assert.equal(card.question, e.question, `${c.name} #${i} question`)
    assert.equal(card.answer, e.answer, `${c.name} #${i} answer`)
    for (const k of ['deck', 'easeFactor', 'repeats', 'lastInterval', 'nextSchedule', 'lastScore', 'lastReviewed']) {
      assert.equal(card[k], e[k], `${c.name} #${i} ${k}`)
    }
  })
}

// -- matrixFactor -------------------------------------------------------------
for (const [i, c] of fx.matrixFactor.entries()) {
  const out = m.matrixFactor(c.matrix, c.rep, c.grade)
  assert.ok(Math.abs(out - c.out) < 1e-9, `matrixFactor #${i}: ${out} != ${c.out}`)
}

// -- matrixUpdate -------------------------------------------------------------
for (const c of fx.matrixUpdate) {
  const out = m.matrixUpdate(c.matrix, c.rep, c.grade, c.requested)
  assert.equal(out.length, c.rows ?? c.dims?.[0] ?? 5, `${c.name}: rows`)
  if (c.row0) assert.deepEqual(out[0], c.row0, `${c.name}: row0 preserved`)
  assert.ok(Math.abs(out[c.row][c.col] - c.cell) < 1e-9, `${c.name}: cell`)
}

// -- scheduleWith -------------------------------------------------------------
for (const c of fx.schedule) {
  const out = m.scheduleWith(c.ease, c.repeats, c.interval, c.grade, DEFAULT_MATRIX())
  assert.ok(Math.abs(out.easeFactor - c.out.easeFactor) < 1e-9, `${c.name}: ease`)
  assert.equal(out.repeats, c.out.repeats, `${c.name}: repeats`)
  assert.ok(Math.abs(out.lastInterval - c.out.lastInterval) < 1e-9, `${c.name}: interval`)
  const [r, g, v] = c.matrixCell
  assert.ok(Math.abs(out.matrix[r][g] - v) < 1e-9, `${c.name}: matrix cell`)
}

// -- applyReviewProps ---------------------------------------------------------
for (const c of fx.applyReviewProps) {
  const out = m.applyReviewProps(c.lines, c.blockLine, c.newProps)
  assert.deepEqual(out, c.expected, `${c.name}: lines`)
}

// -- findAnchorLine (companion of applyReviewProps) ----------------------------
assert.equal(m.findAnchorLine(['x', '- card ^c1  '], '^c1'), 1)
assert.equal(m.findAnchorLine(['x'], '^c1'), -1)

console.log(
  `srs parity ok — ${fx.qa.length} qa, ${fx.props.length} props, ${fx.extract.length} extract, ` +
    `${fx.matrixFactor.length} factor, ${fx.matrixUpdate.length} update, ${fx.schedule.length} schedule, ${fx.applyReviewProps.length} surgery`
)
