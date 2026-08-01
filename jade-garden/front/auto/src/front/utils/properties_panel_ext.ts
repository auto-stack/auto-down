// properties_panel_ext.ts — hand-written TS extension for properties_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs facade + useDebounceFn re-exports (dual-resolution shim /
//   npm import),
// - the lucide icon re-exports (rendered via `dyn`),
// - syncEntries / normalize / inferType (Object.entries, Array.isArray,
//   typeof chains, a regex literal for the date check),
// - fmJson (the deep frontmatter watch surrogate: JSON.stringify of the
//   active tab's frontmatter — watching its string form triggers on the
//   same mutation set as the original's `watch(fm, ..., { deep: true })`),
// - propsDirty (the dirty computed's JSON.stringify comparisons),
// - commitFrontmatter (updateFrontmatter's fm rebuild + assignment +
//   debounced save — typeof/Number.isNaN/split chains),
// - setEntryType (the setType value conversions incl. Boolean()/split),
// - tryAddProperty (addProperty's trim/dup guard + alert()),
// - withPropDisplay (per-entry display fields: the type branch booleans,
//   the true/false label, the list placeholder — no Call/ternary
//   bindings in the DSL view; mutates entries in place so write-backs
//   still hit the real entry objects),
// - eventValue (the ($event.target as HTMLInputElement).value cast),
// - tabsActiveTab (typed predicate-style accessor — a dot-ref computed
//   body over a composable field would be mis-typed, README gap 28).
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

/** Original inferType. */
function inferType(value: PropValue): PropEntry['type'] {
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    if (value === 'true' || value === 'false') return 'boolean'
  }
  return 'text'
}

/** Original normalize. */
function normalize(value: string | number | boolean | string[] | null | undefined): PropValue {
  if (value === undefined) return ''
  if (value === null) return null
  return value
}

/** Original syncEntries: rebuild the entry list from the active tab's
 *  frontmatter. */
export function syncEntries(tabs: { activeTab: any }): PropEntry[] {
  const fm: Record<string, any> = tabs.activeTab?.frontmatter ?? {}
  return Object.entries(fm).map(([key, raw]) => {
    const value = normalize(raw)
    return { key, value, type: inferType(value) }
  })
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
 *  (skipping blank keys and null values, coercing by declared type),
 *  assign it to the active tab, and schedule the debounced save. */
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

/** Original addProperty's guard + push (the widget clears the inputs and
 *  commits when this returns true). */
export function tryAddProperty(entries: PropEntry[], newKey: string, newValue: string): boolean {
  const key = newKey.trim()
  if (!key) return false
  if (entries.some((e) => e.key === key)) {
    alert(`Property "${key}" already exists.`)
    return false
  }
  entries.push({ key, value: newValue, type: 'text' })
  return true
}

/** Per-entry display fields, computed in place so handler write-backs
 *  (entry.key / entry.value) still land on the real entry objects:
 *  the boolean/date/other branch booleans (v-if/v-else-if/v-else on
 *  entry.type), the {{ entry.value ? 'true' : 'false' }} label, the
 *  :placeholder ternary, and the row index (the DSL's indexed v-for
 *  auto-:key emits `idx?.id` on a number loop var — TS-invalid — so the
 *  loop runs unindexed over these display objects instead). */
export function withPropDisplay(entries: PropEntry[]): PropEntry[] {
  ;(entries ?? []).forEach((e, i) => {
    e.idx = i
    e.is_bool = e.type === 'boolean'
    e.is_date = e.type === 'date'
    e.is_other = e.type !== 'boolean' && e.type !== 'date'
    e.bool_label = e.value ? 'true' : 'false'
    e.placeholder_text = e.type === 'list' ? 'comma, separated, values' : 'value'
  })
  return entries ?? []
}

/** Original: ($event.target as HTMLInputElement).value (also the select's
 *  HTMLSelectElement cast). */
export function eventValue(e: Event): string {
  return (e.target as HTMLInputElement).value
}

/** Typed accessor for the active tab (README gap 28: a bare dot-ref
 *  computed body over a composable field is mis-typed by the name
 *  heuristic; a Call body emits computed<any>). */
export function tabsActiveTab(tabs: { activeTab: any }): any {
  return tabs.activeTab ?? null
}
