// Stream tri-state audit (plan 032 P1/T1+T2): every BlockType kind ×
// {unclosed, open, closed} streamed through the REAL pipe
// (StreamingRenderer → markdown segment → MarkdownRender → parseDocument with
// the final flag) and asserted on its DOM shape. The per-kind rulings (D2
// table) live in the plan file; this file pins them same-source against the
// fixtures/tri-state.ts corpus:
//
//   A = default panel path, zero stream-slot registration (expected for all
//       kinds after the P2 table unification — Table included)
//
// T1 scope: corpus loading contract — 17 kinds present, shape well-formed,
// closed fixtures resolve their kind, streaming prefixes parse without
// throwing. T2 adds the rendered-DOM assertions per state.

import { describe, expect, it } from 'vitest'
import { parseDocument } from '../markdown-parser.generated'
import { TRI_STATE, TRI_STATE_KINDS } from './fixtures/tri-state'

describe('tri-state corpus loading contract (T1)', () => {
  it('covers exactly the 17 BlockType kinds', () => {
    expect(Object.keys(TRI_STATE).sort()).toEqual([...TRI_STATE_KINDS].sort())
    expect(TRI_STATE_KINDS).toHaveLength(17)
  })

  it('container members carry no fixtures; every other kind has closed + closedKind', () => {
    for (const kind of TRI_STATE_KINDS) {
      const doc = TRI_STATE[kind]
      if (doc.ridesContainer) {
        expect(doc.unclosed, kind).toBeNull()
        expect(doc.open, kind).toBeNull()
        expect(doc.closed, kind).toBeNull()
        expect(doc.closedKind, kind).toBeNull()
      } else {
        expect(typeof doc.closed, kind).toBe('string')
        expect(doc.closed!.length, kind).toBeGreaterThan(0)
        expect(doc.closedKind, kind).toBeTruthy()
      }
    }
  })

  it('closed fixtures parse to their declared kind (final=true)', () => {
    for (const kind of TRI_STATE_KINDS) {
      const doc = TRI_STATE[kind]
      if (doc.ridesContainer) continue
      const nodes = parseDocument(doc.closed!, true)
      expect(nodes.length, kind).toBeGreaterThanOrEqual(1)
      expect(nodes[0].type, kind).toBe(doc.closedKind)
    }
  })

  it('unclosed/open prefixes parse without throwing (final=false)', () => {
    for (const kind of TRI_STATE_KINDS) {
      const doc = TRI_STATE[kind]
      for (const prefix of [doc.unclosed, doc.open]) {
        if (prefix == null) continue
        expect(() => parseDocument(prefix, false), kind).not.toThrow()
      }
    }
  })
})
