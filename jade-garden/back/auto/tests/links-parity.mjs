// TS-twin parity test for the generated links scanners (Plan 021 slice 2).
// Same fixtures asserted by the rust shell (../server/src/links.rs
// links_gen_parity_fixtures). Run: node tests/links-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/links_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { lines } = JSON.parse(readFileSync(join(here, 'links-fixtures.json'), 'utf8'))

for (const c of lines) {
  const wiki = m.scanWikiLinksLine(c.line).map((h) => ({ title: h.title, blockId: h.blockId }))
  assert.deepEqual(wiki, c.wiki, `wiki scan: ${c.line}`)

  const refs = [...m.scanBlockRefsLine(c.line)]
  assert.deepEqual(refs, c.refs, `block refs: ${c.line}`)

  const tags = [...m.scanTagsLine(c.line)]
  assert.deepEqual(tags, c.tags, `tags scan: ${c.line}`)
}

// orchestration: row shaping + block uuid binding + trailing-newline lines()
const body = '- [ ] 待办 [[Tasks]] #todo\n\n((123e4567-e89b-42d3-a456-426614174000))\n'
const blocks = [{ uuid: 'u-1', lineStart: 0, lineEnd: 1 }, { uuid: 'u-2', lineStart: 2, lineEnd: 3 }]
const rows = m
  .scanLinkRows(body, 'Hello World.ad', blocks)
  .map((r) => ({
    sourcePage: r.sourcePage,
    sourceBlockUuid: r.sourceBlockUuid,
    targetPage: r.targetPage,
    targetBlockUuid: r.targetBlockUuid,
    linkType: r.linkType,
    context: r.context,
  }))
assert.deepEqual(rows, [
  {
    sourcePage: 'Hello World.ad',
    sourceBlockUuid: 'u-1',
    targetPage: 'Tasks',
    targetBlockUuid: '',
    linkType: 'page',
    context: '- [ ] 待办 [[Tasks]] #todo',
  },
  {
    sourcePage: 'Hello World.ad',
    sourceBlockUuid: 'u-2',
    targetPage: '',
    targetBlockUuid: '123e4567-e89b-42d3-a456-426614174000',
    linkType: 'block',
    context: '((123e4567-e89b-42d3-a456-426614174000))',
  },
])

const tagRows = m
  .scanTagRows('#tag_3 纯 ASCII 标签', 'Tags.ad', [])
  .map((t) => ({ pagePath: t.pagePath, tag: t.tag, blockUuid: t.blockUuid }))
assert.deepEqual(tagRows, [{ pagePath: 'Tags.ad', tag: 'tag_3', blockUuid: '' }])

console.log(`links parity ok — ${lines.length} line fixtures + orchestration`)
