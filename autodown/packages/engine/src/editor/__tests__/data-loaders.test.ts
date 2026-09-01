// Data-loader channel tests (plan 038 T1): the module-level loader slot the
// EngineEditor props watch feeds and the node-view bridge reads — the P1
// leg of the Query/Embed data-loading hookup (DEBTS 026①). Semantics:
// registration replaces the whole slot object, the un-set state reads as
// undefined loaders (the "No query runner configured" placeholder), and a
// scoped run restores the previous registration on exit.

import { afterEach, describe, expect, it } from 'vitest'
import {
  getDataLoaders,
  setDataLoaders,
  withDataLoaders,
  type EmbeddedBlock,
  type QueryResultEnvelope,
} from '../engine/data-loaders'

describe('data-loaders module slot (plan 038 T1)', () => {
  afterEach(() => {
    setDataLoaders({})
  })

  it('reads undefined loaders before any registration (placeholder semantics)', () => {
    const slot = getDataLoaders()
    expect(slot.runQuery).toBeUndefined()
    expect(slot.loadBlock).toBeUndefined()
  })

  it('setDataLoaders registers both loaders and getDataLoaders reads them back', async () => {
    const runQuery = async (q: string): Promise<QueryResultEnvelope> => ({
      results: [{ marker: '§', content: q }],
    })
    const loadBlock = async (id: string): Promise<EmbeddedBlock | null> => ({
      title: 'Other',
      content: `#${id}`,
    })
    setDataLoaders({ runQuery, loadBlock })
    const slot = getDataLoaders()
    expect(slot.runQuery).toBe(runQuery)
    expect(slot.loadBlock).toBe(loadBlock)
    const envelope = await slot.runQuery!('table tasks')
    expect(envelope.results[0]!.content).toBe('table tasks')
    const block = await slot.loadBlock!('abc123')
    expect(block?.title).toBe('Other')
  })

  it('partial registration keeps the other loader slot undefined', () => {
    const runQuery = async () => ({ results: [] })
    setDataLoaders({ runQuery })
    const slot = getDataLoaders()
    expect(slot.runQuery).toBe(runQuery)
    expect(slot.loadBlock).toBeUndefined()
  })

  it('setDataLoaders({}) resets to the un-set state (EngineEditor unmount shape)', () => {
    setDataLoaders({ runQuery: async () => ({ results: [] }) })
    setDataLoaders({})
    const slot = getDataLoaders()
    expect(slot.runQuery).toBeUndefined()
    expect(slot.loadBlock).toBeUndefined()
  })

  it('withDataLoaders scopes a registration and restores the previous one', async () => {
    const outer = async () => ({ results: [] })
    setDataLoaders({ runQuery: outer })
    const inner = async () => ({ results: [{ marker: '§', content: 'x' }] })
    const out = withDataLoaders({ loadBlock: inner }, () => {
      const slot = getDataLoaders()
      // the scoped object REPLACES the slot wholesale (props-watch shape),
      // not merges — outer is invisible inside the window
      expect(slot.runQuery).toBeUndefined()
      expect(slot.loadBlock).toBe(inner)
      return 42
    })
    expect(out).toBe(42)
    expect(getDataLoaders().runQuery).toBe(outer)
    expect(getDataLoaders().loadBlock).toBeUndefined()
  })
})
