// properties_panel_ext.ts — hand-written TS extension for properties_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs facade + useDebounceFn re-exports (dual-resolution shim /
//   npm import),
// - the lucide icon re-exports (rendered via `dyn`),
// - inferType (exported since the PLAN-077 sink: the .at's sync_entries
//   module fn calls it per value over the use-fn channel — typeof/
//   Array.isArray chains and the date regex literal have no DSL word;
//   highlight_context precedent),
// - normalize (private, propsDirty's per-entry normalize call),
// - fmJson (the deep frontmatter watch surrogate: JSON.stringify of the
//   active tab's frontmatter — watching its string form triggers on the
//   same mutation set as the original's `watch(fm, ..., { deep: true })`;
//   JSON.stringify has no VM word — Q-2 ext-bridge ruling),
// - propsDirty (the dirty computed's JSON.stringify comparisons — Q-2),
// - commitFrontmatter (updateFrontmatter's fm rebuild + assignment +
//   debounced save — typeof value-domain dispatch, Number/isNaN coercion
//   and the facade write are one body; T-00 correction of the plan's
//   partial-sink prediction),
// - setEntryType (the setType value conversions — Boolean()/Array.isArray/
//   String() coercions over a typeof dispatch; T-00 correction).
//
// PLAN-077 T-05 sink: syncEntries (map iteration + row construction),
// tryAddProperty (dup loop + push + alert), withPropDisplay (in-place
// display fields), tabsActiveTab (two-step null guard) moved into the .at
// as module fns, and eventValue dissolved into the handlers (mode doc
// §6.1).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useDebounceFn } from '@vueuse/core'
import { Plus, Trash2, Check, X } from 'lucide-vue-next'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore, useDebounceFn, Plus, Trash2, Check, X }

export type PropValue = string | number | boolean | string[] | null

export interface PropEntry {
  key: string
  value: PropValue
  type: 'text' | 'number' | 'boolean' | 'date' | 'list'
  // Display fields added by withPropDisplay (in place).
  idx?: number
  is_bool?: boolean
  is_date?: boolean
  is_other?: boolean
  bool_label?: string
  placeholder_text?: string
}

/** Original inferType — exported bridge: the .at's sync_entries calls it
 *  per value (typeof/Array.isArray/regex have no DSL word). The param is
 *  `any` (not PropValue): the emitted call site passes an Object.entries
 *  destructured value, which TS5 infers as `unknown` at a plain-`any`
 *  receiver — unknown is not assignable to PropValue (TS2345, worktree
 *  regen T-05). */
export function inferType(value: any): PropEntry['type'] {
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    if (value === 'true' || value === 'false') return 'boolean'
  }
  return 'text'
}

/** Original normalize — private survivor: propsDirty calls it per entry
 *  (the sunk sync_entries passes JSON values through raw; the undefined arm
 *  is unreachable from Object.entries' JSON value domain). */
function normalize(value: string | number | boolean | string[] | null | undefined): PropValue {
  if (value === undefined) return ''
  if (value === null) return null
  return value
}

/** Deep-watch surrogate: the widget watches this computed's string form
 *  (original: watch(() => tabs.activeTab?.frontmatter, syncEntries,
 *  { deep: true })). */
export function fmJson(tabs: { activeTab: any }): string {
  return JSON.stringify(tabs.activeTab?.frontmatter ?? {})
}

/** Original dirty computed. */
export function propsDirty(entries: PropEntry[], tabs: { activeTab: any }): boolean {
  const fm: Record<string, any> = tabs.activeTab?.frontmatter ?? {}
  if (entries.length !== Object.keys(fm).length) return true
  for (const e of entries) {
    const current = normalize(fm[e.key])
    if (JSON.stringify(current) !== JSON.stringify(e.value)) return true
  }
  return false
}

/** Original updateFrontmatter: rebuild the frontmatter map from the entries
 * (skipping blank keys and null values, coercing by declared type),
 * assign it to the active tab, and schedule the debounced save. */
export function commitFrontmatter(
  tabs: { activeTab: any },
  entries: PropEntry[],
  debouncedSave: () => void,
): void {
  const tab = tabs.activeTab
  if (!tab) return
  const fm: Record<string, any> = {}
  for (const e of entries) {
    if (!e.key.trim()) continue
    if (e.value === null) continue
    if (e.type === 'number' && typeof e.value === 'string') {
      const n = Number(e.value)
      fm[e.key] = Number.isNaN(n) ? e.value : n
    } else if (e.type === 'boolean' && typeof e.value === 'string') {
      fm[e.key] = e.value === 'true'
    } else if (e.type === 'list' && typeof e.value === 'string') {
      fm[e.key] = e.value.split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      fm[e.key] = e.value
    }
  }
  tab.frontmatter = fm
  // Mark the tab dirty: saveTabIfDirty gates on tab.dirty, which only body
  // edits (SetBody) set. Without this, a frontmatter-only edit persists only
  // when it lands inside a pending body-save debounce window — a timing
  // race the VM backend's slower saves exposed (plan 022 Phase 3: the
  // editor's anchor-stamp save fired first, cleared dirty, and the panel's
  // debounced save became a no-op, dropping the edit).
  tab.dirty = true
  debouncedSave()
}

/** Original setType's conversion body (the updateFrontmatter call that
 *  follows it is the widget's commitFrontmatter). The select's @change
 *  value arrives as a plain string. */
export function setEntryType(entries: PropEntry[], idx: number, type: string): void {
  const e = entries[idx]
  if (!e) return
  e.type = type as PropEntry['type']
  if (type === 'boolean') {
    e.value = Boolean(e.value)
  } else if (type === 'list') {
    e.value = Array.isArray(e.value)
      ? e.value
      : String(e.value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  } else {
    e.value = String(e.value ?? '')
  }
}


