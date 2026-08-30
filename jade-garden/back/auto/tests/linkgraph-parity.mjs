// TS-twin parity test for the generated linkgraph module (plan-022 Phase 5).
//
// Runs the SAME fixtures the rust shell asserts
// (../server/src/linkgraph_parity tests) through the a2ts emission, so both
// targets are pinned to one fixture file. Run: node tests/linkgraph-parity.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../gen-ts/linkgraph_gen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const { cases } = JSON.parse(readFileSync(join(here, 'linkgraph-fixtures.json'), 'utf8'))

const buildRows = (c) => ({
  pages: c.pages.map((p) => new m.LgPage(p.path, p.title)),
  aliases: c.aliases.map((a) => new m.LgAlias(a.tagName, a.pagePath)),
  links: c.links.map((l) => new m.LgLink(l.sourcePage, l.targetPage, l.context, l.sourceBlockUuid, l.targetBlockUuid, l.linkType)),
})

for (const c of cases) {
  const { pages, aliases, links } = buildRows(c)
  if (c.kind === 'backlinks') {
    const rows = m.backlinksOf(pages, aliases, links, c.title)
    assert.equal(rows.length, c.expected.length, `case \`${c.name}\`: count`)
    rows.forEach((r, i) => {
      assert.equal(r.sourcePage, c.expected[i].sourcePage, `case \`${c.name}\` #${i}: sourcePage`)
      assert.equal(r.sourceBlockUuid, c.expected[i].sourceBlockUuid, `case \`${c.name}\` #${i}: sourceBlockUuid`)
      assert.equal(r.context, c.expected[i].context, `case \`${c.name}\` #${i}: context`)
    })
  } else if (c.kind === 'outlinks') {
    const rows = m.outlinksOf(pages, aliases, links, c.title)
    assert.equal(rows.length, c.expected.length, `case \`${c.name}\`: count`)
    rows.forEach((r, i) => {
      assert.equal(r.targetPage, c.expected[i].targetPage, `case \`${c.name}\` #${i}: targetPage`)
      assert.equal(r.targetBlockUuid, c.expected[i].targetBlockUuid, `case \`${c.name}\` #${i}: targetBlockUuid`)
      assert.equal(r.linkType, c.expected[i].linkType, `case \`${c.name}\` #${i}: linkType`)
    })
  } else if (c.kind === 'graph') {
    const g = m.graphData(pages, aliases, links)
    assert.equal(g.nodes.length, c.expected.nodes.length, `case \`${c.name}\`: node count`)
    g.nodes.forEach((n, i) => {
      assert.equal(n.id, c.expected.nodes[i].id, `case \`${c.name}\` node #${i}: id`)
      assert.equal(n.label, c.expected.nodes[i].label, `case \`${c.name}\` node #${i}: label`)
      assert.equal(n.degree, c.expected.nodes[i].degree, `case \`${c.name}\` node #${i}: degree`)
    })
    assert.equal(g.edges.length, c.expected.edges.length, `case \`${c.name}\`: edge count`)
    g.edges.forEach((e, i) => {
      assert.equal(e.source, c.expected.edges[i].source, `case \`${c.name}\` edge #${i}: source`)
      assert.equal(e.target, c.expected.edges[i].target, `case \`${c.name}\` edge #${i}: target`)
    })
  } else if (c.kind === 'resolve') {
    const path = m.resolvePagePath(pages, aliases, c.title)
    assert.equal(path, c.expected, `case \`${c.name}\`: resolve`)
  } else {
    throw new Error('unknown kind ' + c.kind)
  }
}

console.log(`linkgraph parity ok — ${cases.length} cases`)
