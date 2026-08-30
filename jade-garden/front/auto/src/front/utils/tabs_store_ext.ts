// tabs_store_ext.ts — hand-written TS extension for tabs_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/. (In the gen
// project the import resolves to stubs/gen_lib_api.ts, a behavior-free
// mirror that only exists so gen-side vue-tsc passes — it never ships.)
//
// Only what the DSL genuinely cannot express lives here:
// - the load() catch branch (readWikiSafe's null return maps to the store's
//   `if doc == null` branches — the original caught load errors),
// - `rethrow` (the DSL has try/catch/finally but no `throw` statement; the
//   Save handler's catch calls it so save rejections propagate to facade
//   callers exactly like the original Pinia store),
// - regex literals (stripExt; the DSL has no regex),
// - the cross-store call into the Pinia recentFiles store,
// - window.confirm with an interpolated message.
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { readWiki, writeWiki, type WikiDoc } from '../../../../src/lib/api'
import { parseBody, type PBlock } from '../../../../src/lib/parser_gen'
import { useRecentFilesStore } from '../../../../src/stores/recentFiles'

export { writeWiki }

// plan-022 Phase 5: save-time lazy anchor injection now consumes the
// parser.at TS twin (front/src/lib/parser_gen.ts, GENERATED) — the
// blockParser.ts hand-written mirror is retired (three-mirror unification).

/** Re-throws the caught error. The DSL gained try/catch/finally
 *  (compiler >= c5b5fecf) but has no `throw` statement, so the Save
 *  handler's `catch (e) { rethrow(e) }` restores the original save()
 *  semantics: the rejection propagates out of the async handler (after the
 *  finally block clears tab.saving) to whoever awaited save(). This closes
 *  the deviation formerly documented here and in front/auto/README.md
 *  gap 4 (writeWikiSafe swallowed save failures into console.error). */
export function rethrow(e: unknown): never {
  throw e
}

// ---- save-time lazy anchor injection (was blockParser.ts) ----

const ANCHORABLE_KINDS = new Set([
  'heading',
  'paragraph',
  'bullet',
  'ordered',
  'task',
  'blockquote',
])

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '')
}

function generateHeadingId(content: string, used: Set<string>): string {
  let slug = slugify(content)
  if (!slug) slug = 'heading'
  let candidate = slug
  let i = 1
  while (used.has(candidate)) {
    candidate = `${slug}-${i}`
    i += 1
  }
  return candidate
}

function generateBlockId(): string {
  // Obsidian-style short anchor: 7 base62 chars (~2e12 space; collisions
  // resolved by the caller's used-set). Full UUIDs are overkill for block
  // refs and made every line look machine-generated.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(7)
    crypto.getRandomValues(buf)
    let id = ''
    for (let i = 0; i < 7; i++) id += alphabet[buf[i]! % alphabet.length]
    return id
  }
  let id = ''
  for (let i = 0; i < 7; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)]
  return id
}

// Blocks that self-identify as flashcards must carry an anchor or the SRS
// scanner (back srs extract_cards) skips them.
const CARD_TAG_RE = /#card\b|\[\[card\]\]/
const CLOZE_RE = /\{\{cloze\s/

/** Obsidian-compatible lazy anchoring. The editor (engine) preserves existing
 *  ^anchors through parse→edit→serialize on its own, so save-time anchor
 *  generation is limited to blocks that NEED an id to function:
 *  - headings: `[[Page#Heading Text]]` resolves via the heading's ^slug
 *  - flashcard blocks (`#card` / `[[card]]` / `{{cloze …}}`): the SRS
 *    scanner requires block_id
 *  Everything else stays unanchored until something references it (copy
 *  block link assigns one on demand). Unchanged blocks reuse the id from
 *  `previousBody` so re-save never churns existing anchors.
 *
 *  Segmentation = parser_gen.parseBody (parser.at a2ts twin): PBlock gives
 *  kind/content/blockId + the line range the `^id` splice needs. */
export function ensureBlockAnchors(body: string, previousBody?: string): string {
  const lines = body.split('\n')
  const blocks: PBlock[] = parseBody(body)
  const previousBlocks = previousBody ? parseBody(previousBody) : []
  const idByContent = new Map<string, string>()
  for (const pb of previousBlocks) {
    if (!pb.blockId) continue
    idByContent.set(`${pb.kind}:${pb.content}`, pb.blockId)
  }
  const usedIds = new Set(blocks.map((b) => b.blockId).filter(Boolean) as string[])
  for (const block of blocks) {
    if (block.blockId) continue
    // Lazy policy: only functionally-required blocks get an id at save time.
    const needsAnchor =
      block.kind === 'heading' || CARD_TAG_RE.test(block.content) || CLOZE_RE.test(block.content)
    if (!needsAnchor || !ANCHORABLE_KINDS.has(block.kind)) continue
    const key = `${block.kind}:${block.content}`
    const id = idByContent.get(key)
      || (block.kind === 'heading' ? generateHeadingId(block.content, usedIds) : generateBlockId())
    usedIds.add(id)
    const idx = Math.min(block.lineEnd - 1, lines.length - 1)
    lines[idx] = `${lines[idx]} ^${id}`
  }
  return lines.join('\n')
}

/** readWiki that never rejects: the original load() had a try/catch whose
 *  catch branch marked the tab loaded, kept the body, and logged — that
 *  maps to a null return handled in the store's `if doc == null` branch. */
export async function readWikiSafe(path: string): Promise<WikiDoc | null> {
  try {
    return await readWiki(path)
  } catch (e) {
    console.error('Failed to load wiki doc', e)
    return null
  }
}

/** Cross-store bridge into the (still Pinia) recentFiles store. */
export function recordRecent(path: string, title: string): void {
  useRecentFilesStore().record(path, title)
}

/** Adopt a save's server echo without clobbering concurrent user edits
 * (plan 022 Phase 3 double-writer fix). The VM backend's slower save
 * round-trips exposed it: a panel frontmatter commit landing while
 * writeWiki is in flight was reverted by the stale echo
 * (`tab.frontmatter = saved.frontmatter` wrote back the PRE-edit map,
 * silently dropping the edit — e2e 11-properties' disk showed the add-row
 * key surviving next to a reverted `status`).
 *
 * Reference compare-and-swap: commitFrontmatter REPLACES tab.frontmatter
 * (never mutates in place), so an unchanged reference means no user edit
 * raced the round-trip and the echo is safe to adopt wholesale; a changed
 * reference keeps the user's map and re-stamps only the server-owned
 * `updated_at`. The body gets the same guard — the editor re-pushes its
 * body on every change so it self-heals, but adopting a stale echo would
 * flash-revert dirty state mid-typing. */
export function adoptSaveResult(
  tab: any,
  sentFm: Record<string, any>,
  sentBody: string,
  saved: WikiDoc,
): void {
  if (tab.frontmatter === sentFm) {
    tab.frontmatter = saved.frontmatter || {}
  } else {
    const stamped = { ...(tab.frontmatter ?? {}) }
    const updated = (saved.frontmatter ?? {}).updated_at
    if (updated !== undefined) stamped.updated_at = updated
    tab.frontmatter = stamped
  }
  if (tab.body === sentBody) {
    tab.body = saved.body
    tab.originalBody = saved.body
  }
}

/** path.replace(/<ext>$/, '') — the DSL has no regex literals. */
export function stripExt(path: string, ext: string): string {
  return path.replace(new RegExp(ext.replace(/\./g, '\\.') + '$'), '')
}

/** confirm(`Close "${title}" without saving?`) — kept verbatim. */
export function confirmClose(title: string): boolean {
  return confirm(`Close "${title}" without saving?`)
}
