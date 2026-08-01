// agenda_panel_ext.ts — hand-written TS extension for agenda_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs facade re-export (dual-resolution shim),
// - the CalendarClock lucide re-export (rendered via `dyn`),
// - fetchAgendaSafe (try/catch/finally around getAgenda: the original's
//   catch logs and KEEPS the previous groups — a null return means
//   "keep" — and the finally's loading=false lands in the widget's
//   single .then callback, backlinks precedent),
// - formatDate / markerClass (new Date + toLocaleDateString options and a
//   switch statement are not expressible in the DSL) — precomputed per
//   group/task by agendaDisplay so the view needs no Call bindings,
// - the per-task `title || page_path` line (|| is broken in DSL view
//   text — the Bina text codegen drops the operator).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { CalendarClock } from 'lucide-vue-next'
import { getAgenda, type AgendaGroup } from '../../../../src/lib/api'
import { useTabsStore, type Tab } from '../../../../src/stores/tabs'

export { useTabsStore, CalendarClock }

/** Original watch source: `tabs.activeTab?.path` ('' = no active tab). */
export function tabPath(tab: Tab | null): string {
  return tab?.path ?? ''
}

/** Original load(): `getAgenda(14)`; the catch branch logs and leaves
 *  groups untouched, so a null return means "keep the previous groups". */
export async function fetchAgendaSafe(): Promise<AgendaGroup[] | null> {
  try {
    const res = await getAgenda(14)
    return res.groups
  } catch (e) {
    console.error('Failed to load agenda', e)
    return null
  }
}

export interface AgendaTaskView {
  page_path: string
  marker: string
  priority?: string
  content: string
  marker_muted: boolean
  marker_primary: boolean
  marker_done: boolean
  line: string
}

export interface AgendaGroupView {
  date: string
  formatted_date: string
  tasks: AgendaTaskView[]
}

/** Original formatDate: `new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })`. */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Original markerClass switch (uppercased marker). */
function markerClass(marker: string): string {
  switch (marker.toUpperCase()) {
    case 'TODO':
    case 'LATER':
      return 'text-muted-foreground'
    case 'DOING':
    case 'NOW':
      return 'text-primary'
    case 'DONE':
      return 'text-emerald-600 line-through'
    default:
      return 'text-muted-foreground'
  }
}

/** Precomputes every display field (formatted date, marker class flags,
 *  `title || page_path` line) so the view binds plain fields only. The
 *  three marker flags encode the original markerClass string — exactly one
 *  is true, so the quoted-key style map adds the same class the original's
 *  :class="markerClass(task.marker)" did. */
export function agendaDisplay(groups: AgendaGroup[]): AgendaGroupView[] {
  return (groups ?? []).map(g => ({
    date: g.date,
    formatted_date: formatDate(g.date),
    tasks: (g.tasks ?? []).map(t => {
      const cls = markerClass(t.marker)
      return {
        page_path: t.page_path,
        marker: t.marker,
        priority: t.priority,
        content: t.content,
        marker_muted: cls === 'text-muted-foreground',
        marker_primary: cls === 'text-primary',
        marker_done: cls === 'text-emerald-600 line-through',
        line: t.title || t.page_path,
      }
    }),
  }))
}
