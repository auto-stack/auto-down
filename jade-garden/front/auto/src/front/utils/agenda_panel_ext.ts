// agenda_panel_ext.ts — hand-written TS extension for agenda_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs facade re-export (dual-resolution shim),
// - the CalendarClock lucide re-export (rendered via `dyn`),
// - formatDate (new Date + toLocaleDateString options are not expressible
//   in the DSL) — exported since the PLAN-077 sink: the .at's
//   agenda_display module fn calls it per group over the use-fn channel
//   (Q-3 time bridge, snippet_html precedent),
// - the get_agenda contract alias (PLAN-077 sink: the watch body calls the
//   get_agenda contract from its .at body, so the generated SFC emits
//   `import { get_agenda } from '@/lib/api'` and the deploy sed rewrites
//   it to this shim — search_pages precedent).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { CalendarClock } from 'lucide-vue-next'
import { getAgenda, type AgendaResponse } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore, CalendarClock }

/** Contract-name alias of the hand-written client (search_pages precedent). */
export async function get_agenda(days: number): Promise<AgendaResponse> {
  return getAgenda(days)
}

/** Original formatDate: `new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })`. */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}


