// TS-twin parity test for the generated parser (Plan 021 Phase 2 slice 1).
//
// Runs the SAME fixtures the rust shell asserts (../server/src/parser.rs
// parse_gen_parity_fixtures) through the a2ts emission, so both targets are
// pinned to one fixture file. Run: node tests/parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/parser_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { cases } = JSON.parse(readFileSync(join(here, 'fixtures.json'), 'utf8'))

for (const c of cases) {
  // mirrors the rust shell parse_page: frontmatter split first, body parsed
  const scan = m.splitFrontmatterScan(c.text)
  const blocks = m.parseBody(scan.body)
  assert.equal(
    blocks.length,
    c.expected.length,
    `case \`${c.name}\`: block count (${JSON.stringify(blocks)})`,
  )
  blocks.forEach((b, i) => {
    const e = c.expected[i]
    assert.equal(b.kind, e.kind, `case \`${c.name}\` #${i}: kind`)
    assert.equal(b.content, e.content, `case \`${c.name}\` #${i}: content`)
    assert.equal(b.blockId, e.blockId, `case \`${c.name}\` #${i}: blockId`)
    assert.equal(b.lineStart, e.lineStart, `case \`${c.name}\` #${i}: lineStart`)
    assert.equal(b.lineEnd, e.lineEnd, `case \`${c.name}\` #${i}: lineEnd`)
  })
}

// anchor extraction: whitespace-run before ^ required, alphabet enforced
const a = m.extractAnchor('标题 ^my-id_1')
assert.equal(a.content, '标题')
assert.equal(a.id, 'my-id_1')
assert.equal(m.extractAnchor('x^no-space').id, '')
assert.equal(m.extractAnchor('a ^bad!ch').id, '')

// frontmatter scan: hasMarker=false keeps the original text untouched
const fm = m.splitFrontmatterScan('---\ntitle: X\n---\n\nbody')
assert.equal(fm.hasMarker, true)
assert.equal(fm.yaml, '\ntitle: X')
const fmNone = m.splitFrontmatterScan('  纯文本')
assert.equal(fmNone.hasMarker, false)
assert.equal(fmNone.body, '  纯文本')

// Logseq id:: property (uuid shape enforced)
assert.equal(m.findIdPropertyLine('  id:: 123e4567-e89b-42d3-a456-426614174000 '), '123e4567-e89b-42d3-a456-426614174000')
assert.equal(m.findIdPropertyLine('id:: not-a-uuid'), '')

// key:: value properties
const props = m.parseBlockPropertiesLines(['card:: 前门', 'x:: 1', '不是属性'])
assert.deepEqual(
  props.map((p) => ({ key: p.key, value: p.value })),
  [
    { key: 'card', value: '前门' },
    { key: 'x', value: '1' },
  ],
)

console.log(`parity ok — ${cases.length} fixtures × 2 targets`)
