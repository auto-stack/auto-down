// graph_controls_ext.ts — hand-written TS extension for graph_controls.at.
//
// PLAN-078 T-02 sink: centerLabel / opacityLabel moved into graph_controls.at
// module fns (gc_center_label strip_ext discipline form / gc_opacity_label
// math.round word); eventValue dissolved into the SearchInput handler
// (077 properties precedent); the settings write channel moved into module
// fns (gc_set_setting bracket write / gc_reset_settings per-field dot
// writes — P-11-safe form replacing the $patch swap). What remains is only
// what the DSL genuinely cannot express:
// - the graph facade re-export (dual-resolution shim),
// - the lucide icon re-exports (rendered via `dyn`),
// - eventNumber / eventChecked (the ($event.target as HTMLInputElement)
//   casts; eventNumber replicates v-model.number's numeric coercion for
//   the range sliders),
// - RangeInput (native <input type="range">: the DSL maps a class-less
//   `input` element to the shadcn Input component (which drops min/max/
//   step and re-wires the events), and P-12: the DSL `slider` word emits
//   no type="range" on the vue track — so the nine range sliders render
//   through this functional component. Same mounted DOM as the original's
//   plain range inputs (attrs + @input listener fall through).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { Search, SlidersHorizontal, Palette, Magnet, Focus } from 'lucide-vue-next'
import { useGraphStore } from '../../../../src/stores/graph'

export { useGraphStore, Search, SlidersHorizontal, Palette, Magnet, Focus }

/** Native <input type="range"> (see header note). */
export const RangeInput = (props: any) =>
  h('input', {
    type: 'range',
    min: props.min,
    max: props.max,
    step: props.step,
    value: props.value,
    onInput: props.onInput,
  })

/** Range-slider write-back: v-model.number's numeric coercion. */
export function eventNumber(e: Event): number {
  return Number((e.target as HTMLInputElement).value)
}

/** Checkbox write-back. */
export function eventChecked(e: Event): boolean {
  return (e.target as HTMLInputElement).checked
}
