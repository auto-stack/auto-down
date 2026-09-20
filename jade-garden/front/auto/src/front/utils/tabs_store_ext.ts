// tabs_store_ext.ts — hand-written TS extension for tabs_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/. (In the gen
// project the import resolves to stubs/gen_lib_api.ts, a behavior-free
// mirror that only exists so gen-side vue-tsc passes — it never ships.)
//
// PLAN-064 T-04 shrank this face to the web-side shim for the reworked
// store: the six-helper disposal sank stripExt/adoptSaveResult INTO the
// .at (module fns) and inlined readWikiSafe at the call sites. What stays
// here is exactly what the web tree must provide for the store's use line
// (`use back.api: read_wiki, write_wiki, ensureBlockAnchors, recordRecent,
// confirmClose, rethrow`) — the VM tree resolves the same names against
// plain helper fns in the desktop contract copy (back/auto/api.at):
// - read_wiki / write_wiki: aliases of the hand-written client face
//   (write_wiki adapts the field-scalar call to the {frontmatter, body}
//   doc shape the client api owns),
// - rethrow (the DSL has try/catch/finally but no `throw` statement —
//   save rejections propagate to facade callers exactly like the original
//   Pinia store),
// - ensureBlockAnchors (save-time lazy `^anchor` injection, parser.at
//   TS twin segmentation; VM v1 runs identity — registered deviation),
// - recordRecent (cross-store bridge into the Pinia recentFiles store;
//   VM v1 writes the Plan 401 session KV instead — same use line),
// - confirmClose (window.confirm with an interpolated message; VM v1
//   default-confirms — registered deviation).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { readWiki, writeWiki } from '../../../../src/lib/api'
import { parseBody, type PBlock } from '../../../../src/lib/parser_gen'
import { useRecentFilesStore } from '../../../../src/stores/recentFiles'

/** Contract-name alias: readWiki never rejects on its own — the store's
 *  inlined try/catch maps failures to the null branch (the original
 *  load() caught errors; the wrapper lived here until PLAN-064 T-04). */
export function read_wiki(path: string) {
  return readWiki(path)
}

/** Contract-name alias: the #[api] write_wiki(path, frontmatter, body)
 *  field-scalar call shape adapted onto the client doc-shape api.
 *  PLAN-080 T-01: pairs ride reads only — the write sends the serde-default
 *  empty list (backend ignores the field). */
export function write_wiki(path: string, frontmatter: Record<string, any>, body: string) {
  return writeWiki(path, { frontmatter, body, frontmatter_pairs: [] })
}

/** Re-throws the caught error. The DSL has try/catch/finally
 *  (compiler >= c5b5fecf) but no `throw` statement (and catch is
 *  mandatory), so the Save handler's `catch (e) { rethrow(e) }` restores
 *  the original save() semantics: the rejection propagates out of the
 *  async handler (after the finally block clears tab.saving) to whoever
 *  awaited save(). VM-side the same-named plain fn swallows (registered
 *  deviation, PLAN-064 T-04; upgrade = auto-lang throw statement). */
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

/** Cross-store bridge into the (still Pinia) recentFiles store. VM-side
 *  the same-named plain fn writes the Plan 401 session KV instead. */
export function recordRecent(path: string, title: string): void {
  useRecentFilesStore().record(path, title)
}

/** confirm(`Close "${title}" without saving?`) — kept verbatim. VM-side
 *  the same-named plain fn default-confirms (registered deviation). */
export function confirmClose(title: string): boolean {
  return confirm(`Close "${title}" without saving?`)
}
