// create_page_prompt_ext.ts — hand-written TS extension for
// create_page_prompt.at.
//
// Only what the DSL genuinely cannot express lives here: the wikiTitleToPath
// re-export (front/src/lib/wikiLink.ts contains regex literals; the DSL has
// no lib import channel). Dual-resolution shim: resolves to the real module
// in the front tree and to stubs/gen_lib_wikiLink.ts in the gen project.
import { h } from 'vue'
import { wikiTitleToPath } from '../../../../src/lib/wikiLink'

export { wikiTitleToPath }

/** The original's <code> path chip: `code` is not a DSL element and
 *  degrades to a plain <div> (losing the UA monospace style) — render the
 *  real tag through this functional component via dyn (BodyTeleport slot
 *  precedent). */
export const CodeTag = (props: any, { slots }: any) =>
  h('code', { class: props.class }, slots)
