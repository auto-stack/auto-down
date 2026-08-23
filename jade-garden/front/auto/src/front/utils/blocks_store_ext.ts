// blocks_store_ext.ts — hand-written TS extension for blocks_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Only what the DSL genuinely cannot express lives here: Map operations
// and the parseBlocks call (a lib the store cannot import directly).
import { parseBlocks, type ParsedBlock } from '../../../../src/lib/blockParser'

export interface PageBlocks {
  path: string
  blocks: ParsedBlock[]
  updatedAt: number
}

/** The original parse(): parse, cache.set with timestamp, return blocks.
 *  Called directly by the facade (msg handlers cannot return values). */
/** cache arrives as the ?str placeholder (typed string | null, really a Map
 *  once the facade assigns it) -- DSL has no Map type annotation. */
export function parseIntoCache(
  cache: Map<string, PageBlocks> | string | null,
  path: string,
  body: string,
): ParsedBlock[] {
  const blocks = parseBlocks(body)
  const liveCache = cache instanceof Map ? cache : null
  liveCache?.set(path, { path, blocks, updatedAt: Date.now() })
  return blocks
}

/** The original clear(): delete one entry, or clear all when path is the
 *  empty-string sentinel (facade maps the optional arg to ""). */
export function cacheClear(cache: Map<string, PageBlocks> | string | null, path: string): void {
  if (!(cache instanceof Map)) {
    return
  }
  if (path === '') {
    cache.clear()
  } else {
    cache.delete(path)
  }
}
