// TS-twin parity test for the generated search module (Plan 022 slice 5).
//
// Runs the SAME fixtures the rust shell asserts (../server/src/search.rs
// search_gen_parity_fixtures) through the a2ts emission, so both targets
// are pinned to one fixture file. Run: node tests/search-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/search_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { marks, cases } = JSON.parse(readFileSync(join(here, 'search-fixtures.json'), 'utf8'))

for (const c of cases) {
  const pages = c.pages.map((p) => new m.SrPage(p.path, p.title, p.frontmatter))
  const blocks = c.blocks.map((b) => new m.SrBlock(b.uuid, b.pagePath, b.blockId, b.content))
  const hits = m.searchAll(pages, blocks, c.query, c.limit, marks.open, marks.close, marks.ellipsis)
  assert.equal(
    hits.length,
    c.expected.length,
    `case \`${c.name}\`: hit count (${JSON.stringify(hits)})`,
  )
  hits.forEach((h, i) => {
    const e = c.expected[i]
    const label = `case \`${c.name}\` #${i}`
    assert.equal(h.isPage, e.isPage, `${label}: isPage`)
    assert.equal(h.path, e.path, `${label}: path`)
    assert.equal(h.title, e.title, `${label}: title`)
    assert.equal(h.uuid, e.uuid, `${label}: uuid`)
    assert.equal(h.blockId, e.blockId, `${label}: blockId`)
    assert.equal(h.content, e.content, `${label}: content`)
    assert.equal(h.snippet, e.snippet, `${label}: snippet`)
  })
}

// shell contract: "" marks unused SrHit fields; the rust side maps
// blockId/snippet "" back to None (SearchResultDto Option fields)
const probe = m.searchAll(
  [new m.SrPage('a.ad', 'FindMe', '{}')],
  [new m.SrBlock('u9', 'a.ad', '', 'FindMe content')],
  'findme',
  10,
  marks.open,
  marks.close,
  marks.ellipsis,
)
assert.equal(probe.length, 2)
assert.equal(probe[0].isPage, true)
assert.equal(probe[0].snippet, `${marks.open}FindMe${marks.close}`)
assert.equal(probe[1].isPage, false)
assert.equal(probe[1].blockId, '')
assert.equal(probe[1].snippet, `${marks.open}FindMe${marks.close} content`)

console.log(`search parity ok — ${cases.length} fixtures × 2 targets`)
