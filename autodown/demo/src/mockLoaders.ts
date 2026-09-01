// mockLoaders.ts — the demo's Query/Embed data loaders (plan 038 T7).
// Hand-written module next to content.ts (same DSL-boundary note: the
// loader closures are plain functions, registered on the engine's
// module-level slot at entry — the props path would need an app.at round
// trip, and the slot IS the channel the EngineEditor props watch feeds).
//
// The four demonstration routes (keyed by substrings of the query text /
// block id, so one registration covers every sample in content.ts):
//   - 固定结果: any query without a route keyword → two fixed rows
//   - 空:       a query containing "empty"  → { results: [] }
//   - 错误:     a query containing "fail"   → rejects
//   - 未找到:   an embed id containing "missing" → null
// plus a page-in-page embed success route. `calls` records every loader
// invocation (window.__mockLoaderCalls) so the e2e can assert the LOADING
// TIMING: zero calls while a query is still streaming, the call only after
// the block closes (032 ruling A).

import { setDataLoaders, type RunQueryFn, type LoadBlockFn, type QueryResultEnvelope, type EmbeddedBlock } from '@autodown/engine/editor'

export const mockLoaderCalls: string[] = []

function record(call: string): void {
  mockLoaderCalls.push(call)
  ;(window as unknown as { __mockLoaderCalls?: string[] }).__mockLoaderCalls = mockLoaderCalls
}

export const mockRunQuery: RunQueryFn = async (q: string): Promise<QueryResultEnvelope> => {
  record(`query:${q}`)
  if (q.includes('empty')) return { results: [] }
  if (q.includes('fail')) {
    throw new Error('mock query failure (route: fail)')
  }
  return {
    results: [
      { marker: '§', priority: 2, content: 'Fixed result row one (demo mock)', title: 'Demo Page A' },
      { marker: '¶', content: 'Fixed result row two (demo mock)', page_path: 'docs/b.md' },
    ],
  }
}

export const mockLoadBlock: LoadBlockFn = async (id: string): Promise<EmbeddedBlock | null> => {
  record(`block:${id}`)
  if (id.includes('missing')) return null
  return { title: 'Demo Embedded', content: `body of block ${id} (demo mock)` }
}

/** The demo registration: both loaders onto the module-level slot. */
export function registerDemoLoaders(): void {
  setDataLoaders({ runQuery: mockRunQuery, loadBlock: mockLoadBlock })
  // expose the call log at registration time — the e2e timing leg reads it
  // (window.__mockLoaderCalls present from entry, entries grow per call)
  ;(window as unknown as { __mockLoaderCalls?: string[] }).__mockLoaderCalls = mockLoaderCalls
}
