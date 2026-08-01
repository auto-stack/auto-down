// command_palette_ext.ts — hand-written TS extension for command_palette.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the lucide icon re-exports (the item icons are component VALUES stored
//   in the item objects — rendered through PaletteIcon, the `<component
//   :is="item.icon">` stand-in),
// - buildCommands (the commands computed: action closures over stores /
//   window.dispatchEvent / openDailyNote / export+import with pickFile and
//   downloadBlob — DOM APIs, Blob/URL, alert, dynamic import() input —
//   none expressible in the DSL),
// - recentFileItems / allPaletteItems / filterPalette (the recent-files
//   mapping, the spread concat, and the trim/lowercase/includes/slice
//   filter; filterPalette also adds the per-item display fields — row
//   index and has_subtitle — because the indexed v-for auto-:key emits
//   `idx?.id` on a number loop var and the DSL view has no truthy if on a
//   loop-var string field),
// - runPaletteItem (execute's command/file branch — the DSL cannot call a
//   closure stored on an object),
// - nextIndex / prevIndex (the wrap-around modulo),
// - listenPaletteHotkeys / unlistenPaletteHotkeys (the two onKeyStroke
//   registrations: Ctrl/Cmd+P toggle with the alt/shift guard +
//   preventDefault + workspace.root guard, and Escape close — window-level
//   keydown with the handler identity kept for removal; app_shell
//   precedent),
// - focusPaletteInput (the watch(open)'s await nextTick + inputRef.focus()
//   — the DSL has no template refs; the singleton input is located by its
//   placeholder, the same element the original's ref points at).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h, nextTick } from 'vue'
import {
  CalendarDays,
  Network,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  FileSearch,
  Clock,
  Brain,
  Download,
  Upload,
} from 'lucide-vue-next'

// The gen project's lucide-vue-next has no LucideIcon type export — the
// item icons are component values, `any` is precise enough here.
export type LucideIcon = any
import { useTabsStore } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { useSidebarStore } from '../../../../src/stores/sidebar'
import { useThemeStore } from '../../../../src/stores/theme'
import { useRecentFilesStore, type RecentFile } from '../../../../src/stores/recentFiles'
import { useWorkspaceStore } from '../../../../src/stores/workspace'
import { openDailyNote, todayDate } from '../../../../src/lib/dailyNote'
import { exportMarkdown, importMarkdown } from '../../../../src/lib/api'

export {
  useTabsStore,
  useFileTreeStore,
  useSidebarStore,
  useThemeStore,
  useRecentFilesStore,
  useWorkspaceStore,
}

export interface CommandItem {
  id: string
  type: 'command'
  title: string
  subtitle?: string
  icon: LucideIcon
  action: () => void
}

export interface FileItem {
  id: string
  type: 'file'
  title: string
  subtitle: string
  icon: typeof Clock
  recent: RecentFile
}

export type PaletteItem = CommandItem | FileItem

/** Display fields added per item by filterPalette. */
export interface PaletteItemView {
  id: string
  type: 'command' | 'file'
  title: string
  subtitle?: string
  icon: LucideIcon
  action?: () => void
  recent?: RecentFile
  idx: number
  has_subtitle: boolean
}

/** `<component :is="item.icon" class="h-4 w-4 shrink-0 opacity-70" />`
 *  stand-in (the DSL's dyn takes a static symbol, not a loop-var field). */
export const PaletteIcon = (props: { icon: any; class?: string }) =>
  h(props.icon, { class: props.class })

/** Original downloadBlob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Original pickFile. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      resolve(input.files?.[0] || null)
    }
    input.click()
  })
}

/** Original: the commands computed (verbatim list; the theme/sidebar
 *  subtitles and the toggle-theme icon stay reactive because the facade
 *  getters are read inside the widget's computed). */
export function buildCommands(tabs: any, fileTree: any, sidebar: any, theme: any): CommandItem[] {
  return [
    {
      id: 'today',
      type: 'command',
      title: 'Open today\'s note',
      subtitle: 'Create or open the daily journal entry',
      icon: CalendarDays,
      action: () => openDailyNote(todayDate(), tabs, fileTree),
    },
    {
      id: 'global-graph',
      type: 'command',
      title: 'Open global graph',
      subtitle: 'Show the workspace graph view',
      icon: Network,
      action: () => tabs.openGraph(),
    },
    {
      id: 'toggle-theme',
      type: 'command',
      title: 'Toggle theme',
      subtitle: `Current: ${theme.mode}`,
      icon: theme.mode === 'dark' ? Sun : Moon,
      action: () => theme.toggleMode(),
    },
    {
      id: 'toggle-left-sidebar',
      type: 'command',
      title: 'Toggle left sidebar',
      subtitle: sidebar.leftOpen ? 'Hide' : 'Show',
      icon: PanelLeft,
      action: () => sidebar.toggleLeft(),
    },
    {
      id: 'toggle-right-sidebar',
      type: 'command',
      title: 'Toggle right sidebar',
      subtitle: sidebar.rightOpen ? 'Hide' : 'Show',
      icon: PanelRight,
      action: () => {
        sidebar.rightOpen = !sidebar.rightOpen
      },
    },
    {
      id: 'open-file-search',
      type: 'command',
      title: 'Open file search',
      subtitle: 'Quick switcher (Ctrl+O)',
      icon: FileSearch,
      action: () => window.dispatchEvent(new CustomEvent('jade-open-quick-switcher')),
    },
    {
      id: 'review-flashcards',
      type: 'command',
      title: 'Review flashcards',
      subtitle: 'SRS due cards',
      icon: Brain,
      action: () => window.dispatchEvent(new CustomEvent('jade-open-flashcards')),
    },
    {
      id: 'export-markdown',
      type: 'command',
      title: 'Export Markdown',
      subtitle: 'Download workspace as zip of .md files',
      icon: Download,
      action: async () => {
        const blob = await exportMarkdown()
        downloadBlob(blob, 'jade-garden-export.zip')
      },
    },
    {
      id: 'import-markdown',
      type: 'command',
      title: 'Import Markdown',
      subtitle: 'Upload a zip of .md files',
      icon: Upload,
      action: async () => {
        const file = await pickFile('.zip')
        if (!file) return
        const res = await importMarkdown(file)
        alert(`Imported ${res.imported} files`)
        await fileTree.load()
      },
    },
  ]
}

/** Original: the recentFileItems computed. */
export function recentFileItems(files: RecentFile[]): FileItem[] {
  return (files ?? []).map((f) => ({
    id: `recent:${f.path}`,
    type: 'file',
    title: f.title,
    subtitle: f.path,
    icon: Clock,
    recent: f,
  }))
}

/** Original: [...commands.value, ...recentFileItems.value]. */
export function allPaletteItems(commands: CommandItem[], recentItems: FileItem[]): PaletteItem[] {
  return [...(commands ?? []), ...(recentItems ?? [])]
}

/** Original: the filtered computed (trim/lowercase/includes/slice(0, 20)),
 *  plus the per-item display fields (row index for the selected-class
 *  ternaries and mouseenter, has_subtitle for the subtitle v-if). */
export function filterPalette(items: PaletteItem[], query: string): PaletteItemView[] {
  const q = query.trim().toLowerCase()
  const base = !q
    ? items ?? []
    : (items ?? []).filter((item) =>
        [item.title, item.subtitle].join(' ').toLowerCase().includes(q),
      )
  return base.slice(0, 20).map((item, idx) => ({
    ...item,
    idx,
    has_subtitle: !!item.subtitle,
  }))
}

/** Original execute(item): run the command action / open the recent file. */
export function runPaletteItem(item: PaletteItemView, tabs: any): void {
  if (item.type === 'command') {
    item.action?.()
  } else if (item.recent) {
    tabs.open(item.recent.path, item.recent.title)
  }
}

/** Original: (selectedIndex + 1) % filtered.length. */
export function nextIndex(i: number, len: number): number {
  return (i + 1) % len
}

/** Original: (selectedIndex - 1 + filtered.length) % filtered.length. */
export function prevIndex(i: number, len: number): number {
  return (i - 1 + len) % len
}

// The original keeps the onKeyStroke registrations component-lifecycle-scoped;
// the palette is a singleton, so one module-level handler identity suffices
// for removal (app_shell listenOpenFlashcards precedent).
let paletteKeyHandler: ((e: KeyboardEvent) => void) | null = null

/** Original: onKeyStroke('p', ...) with the (ctrl||meta) && !alt && !shift
 *  guard, preventDefault, and the `if (!workspace.root) return` bail, plus
 *  onKeyStroke('Escape', ...) close. */
export function listenPaletteHotkeys(
  workspace: { root: string | null },
  onToggle: () => void,
  onEscape: () => void,
): void {
  paletteKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'p' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      if (!workspace.root) return
      onToggle()
    }
    if (e.key === 'Escape') {
      onEscape()
    }
  }
  window.addEventListener('keydown', paletteKeyHandler)
}

/** Original onUnmounted equivalent (vueuse stops the listeners). */
export function unlistenPaletteHotkeys(): void {
  if (paletteKeyHandler) {
    window.removeEventListener('keydown', paletteKeyHandler)
    paletteKeyHandler = null
  }
}

/** Original watch(open): await nextTick(); inputRef.value?.focus(). The DSL
 *  has no template refs — the palette is a singleton, so the input is
 *  located by its unique placeholder (the same element). */
export function focusPaletteInput(): void {
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(
      'input[placeholder="Type a command or recent file..."]',
    )
    el?.focus()
  })
}
