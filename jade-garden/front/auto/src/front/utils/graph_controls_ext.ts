// graph_controls_ext.ts — hand-written TS extension for graph_controls.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the graph facade re-export (dual-resolution shim),
// - the lucide icon re-exports (rendered via `dyn`),
// - centerLabel (the `graph.centerPath.replace(/\.ad$/, '')` regex),
// - opacityLabel (the `Math.round(textOpacity * 100) + '%'` interpolation),
// - eventNumber / eventChecked (the ($event.target as HTMLInputElement)
//   casts; eventNumber replicates v-model.number's numeric coercion for
//   the range sliders),
// - setGraphNumber / setGraphFlag (the nested settings write-backs —
//   `graph.settings.<key> = value` — which the DSL cannot express as an
//   assignment target),
// - resetGraphSettings (the reset button's $patch + saveSettings — the
//   facade emulates Pinia's $patch; a `$`-named method and the settings
//   object literal have no DSL form).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { Search, SlidersHorizontal, Palette, Magnet, Focus } from 'lucide-vue-next'
import { useGraphStore } from '../../../../src/stores/graph'

export { useGraphStore, Search, SlidersHorizontal, Palette, Magnet, Focus }

/** Native <input type="range">: the DSL maps a class-less `input` element to
 *  the shadcn Input component (which drops min/max/step and re-wires the
 *  events), and `type:` on a dyn block mis-parses (keyword token) — so the
 *  nine range sliders render through this functional component. Same
 *  mounted DOM as the original's plain range inputs (attrs + @input
 *  listener fall through). */
export const RangeInput = (props: any) =>
  h('input', {
    type: 'range',
    min: props.min,
    max: props.max,
    step: props.step,
    value: props.value,
    onInput: props.onInput,
  })

/** Original: {{ graph.centerPath.replace(/\.ad$/, '') }}. */
export function centerLabel(graph: { centerPath: string | null }): string {
  return (graph.centerPath ?? '').replace(/\.ad$/, '')
}

/** Original: {{ Math.round(graph.settings.textOpacity * 100) }}%. */
export function opacityLabel(graph: { settings: { textOpacity: number } }): string {
  return `${Math.round(graph.settings.textOpacity * 100)}%`
}

/** Range-slider write-back: v-model.number's numeric coercion. */
export function eventNumber(e: Event): number {
  return Number((e.target as HTMLInputElement).value)
}

/** Text-input write-back: ($event.target as HTMLInputElement).value. */
export function eventValue(e: Event): string {
  return (e.target as HTMLInputElement).value
}

/** Checkbox write-back. */
export function eventChecked(e: Event): boolean {
  return (e.target as HTMLInputElement).checked
}

/** Original: v-model.number="graph.settings.<key>" (nested write). */
export function setGraphNumber(graph: { settings: any }, key: string, value: number): void {
  graph.settings[key] = value
}

/** Original: v-model="graph.settings.<key>" on a checkbox (nested write). */
export function setGraphFlag(graph: { settings: any }, key: string, value: boolean): void {
  graph.settings[key] = value
}

/** Original reset(): graph.$patch({ settings: { ...defaults } }) +
 *  graph.saveSettings(). */
export function resetGraphSettings(graph: {
  $patch: (partial: { settings?: any }) => void
  saveSettings: () => void
}): void {
  graph.$patch({
    settings: {
      showOrphans: true,
      showMissing: false,
      nodeSize: 12,
      textOpacity: 0.85,
      edgeWidth: 1,
      showArrows: false,
      gravity: 0.05,
      repulsion: 4500,
      attraction: 0.05,
      linkLength: 120,
    },
  })
  graph.saveSettings()
}
