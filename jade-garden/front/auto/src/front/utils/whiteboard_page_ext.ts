// whiteboard_page_ext.ts — hand-written TS extension for whiteboard_page.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs store facade re-export (dual-resolution shim),
// - loadWhiteboard (the original load()'s try/catch/finally — gap 4 —
//   replicated as .then/.catch/.finally over three single-statement
//   closures; order is verbatim: assign doc-or-error, then loading=false),
// - saveWhiteboard (the original save(): writeWhiteboard, tab.dirty=false
//   on success, console.error on failure — fire-and-forget exactly like
//   the original's un-awaited save() calls),
// - addNoteShape (Date.now id + grid position + push; `(doc.shapes ??= [])`
//   matches the original's initial `{ shapes: [] }` guarantee),
// - shapeList (per-shape view fields: selected flag for the quoted-key
//   style map, position strings for style_obj — wrapper objects hold the
//   ORIGINAL shape reference so updateLabel still mutates doc.shapes and
//   the extra fields never reach writeWhiteboard),
// - readLabel (event.target.innerText — DOM read on the contenteditable),
// - openShapeTarget (endsWith / .ad suffix / tabs.open),
// - showError / showCanvas (the v-else-if / v-else branch guards — else
//   chains have no DSL form).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useTabsStore } from '../../../../src/stores/tabs'
import { readWhiteboard, writeWhiteboard } from '../../../../src/lib/api'

export { useTabsStore }

/** Original: async function load() { loading = true; error = null; try {
 *  doc = await readWhiteboard(path) } catch (e) { error = e.message ||
 *  String(e) } finally { loading = false } } — invoked onMounted. */
export function loadWhiteboard(
  path: string,
  setDoc: (d: any) => void,
  setErr: (e: string) => void,
  done: () => void,
): void {
  readWhiteboard(path)
    .then((d) => setDoc(d))
    .catch((e) => setErr(e?.message || String(e)))
    .finally(() => done())
}

/** Original: async function save() { try { await writeWhiteboard(path,
 *  doc.value); const tab = tabs.tabs.find(t => t.path === props.path);
 *  if (tab) tab.dirty = false } catch (e) { console.error('Failed to
 *  save whiteboard', e) } } — callers never await it. */
export function saveWhiteboard(tabsStore: any, path: string, doc: any): void {
  writeWhiteboard(path, doc)
    .then(() => {
      const tab = tabsStore.tabs.find((t: any) => t.path === path)
      if (tab) tab.dirty = false
    })
    .catch((e) => console.error('Failed to save whiteboard', e))
}

/** Original: addShape — id from Date.now, grid slot from the shape count,
 *  push onto doc.shapes (the original's doc starts as { shapes: [] }). */
export function addNoteShape(doc: any): void {
  const shapes = (doc.shapes ??= [])
  const id = `shape-${Date.now()}`
  const x = 50 + (shapes.length % 5) * 160
  const y = 50 + Math.floor(shapes.length / 5) * 120
  shapes.push({ id, kind: 'note', x, y, width: 140, height: 100, label: 'New note' })
}

/** Original: shapes = computed(() => doc.value.shapes) — plus the per-shape
 *  view fields the DSL cannot derive inline: `selected` (the ring class
 *  condition, selectedId === shape.id) and the position style strings
 *  (`${shape.x}px` etc.). Wrappers keep the ORIGINAL shape reference, so
 *  label edits still land on doc.shapes entries and the extra fields never
 *  leak into writeWhiteboard. */
export function shapeList(doc: any, selectedId: string | null): any[] {
  return (doc?.shapes ?? []).map((s: any) => ({
    shape: s,
    sid: s.id,
    selected: selectedId === s.id,
    s_left: `${s.x}px`,
    s_top: `${s.y}px`,
    s_width: `${s.width}px`,
    s_height: `${s.height}px`,
  }))
}

/** Original: updateLabel reads (event.target as HTMLDivElement).innerText. */
export function readLabel(evt: any): string {
  return (evt?.target as HTMLElement)?.innerText ?? ''
}

/** Original: openTarget — ignore shapes without a target, append .ad
 *  unless already suffixed, open in the tabs store. */
export function openShapeTarget(tabsStore: any, shape: any): void {
  if (!shape?.target) return
  const targetPath = shape.target.endsWith('.ad') ? shape.target : `${shape.target}.ad`
  tabsStore.open(targetPath)
}

/** Original: v-else-if="error" (reached only when !loading). */
export function showError(loading: boolean, error: string | null): boolean {
  return !loading && !!error
}

/** Original: v-else (reached only when !loading && !error). */
export function showCanvas(loading: boolean, error: string | null): boolean {
  return !loading && !error
}
