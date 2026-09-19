// command_palette_ext.ts — hand-written TS extension for command_palette.at.
//
// PLAN-076 T-03 sink (mode doc §5.2): recentFileItems / allPaletteItems /
// filterPalette / nextIndex / prevIndex moved INTO the .at (module fns
// recent_file_items / all_palette_items / filter_palette / next_index /
// prev_index), and runPaletteItem split — the file branch (tabsStore.open)
// sank into the widget's Execute handlers; the command branch stays here as
// runCommandAction (the DSL cannot call a closure stored on an object).
// What stays here is exactly the host face:
// - the store facade re-exports (dual-resolution shims),
// - the lucide icon imports/re-exports (component VALUES — buildCommands
//   stores them in the item objects; Clock renders through the view's file
//   branch, ruling B),
// - buildCommands (the commands computed: action closures over stores /
//   window.dispatchEvent / openDailyNote / export+import with pickFile and
//   downloadBlob — DOM APIs, Blob/URL, alert, dynamic import() input —
//   none expressible in the DSL),
// - runCommandAction (execute's command branch — see header),
// - PaletteIcon (the `<component :is="item.icon">` stand-in),
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
export { Clock }
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

/** The sunk recent_file_items rows (icon injected view-side, ruling B). */
export interface FileItem {
  id: string
  type: 'file'
  title: string
  subtitle: string
  recent: RecentFile
}

export type PaletteItem = CommandItem | FileItem

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

/** PLAN-076 T-03 split sink: execute's command branch — the DSL cannot call
 *  a closure stored on an object, so this stays a bridge. The file branch
 *  (tabsStore.open) lives in the widget's Execute handlers. */
export function runCommandAction(item: any): void {
  if (item.type === 'command') {
    item.action?.()
  }
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
