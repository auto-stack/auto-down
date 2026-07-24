<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { onKeyStroke } from '@vueuse/core'
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
  type LucideIcon,
} from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import { useFileTreeStore } from '@/stores/fileTree'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import { useRecentFilesStore } from '@/stores/recentFiles'
import { useWorkspaceStore } from '@/stores/workspace'
import { openDailyNote, todayDate } from '@/lib/dailyNote'
import { exportMarkdown, importMarkdown } from '@/lib/api'
import type { RecentFile } from '@/stores/recentFiles'

interface CommandItem {
  id: string
  type: 'command'
  title: string
  subtitle?: string
  icon: LucideIcon
  action: () => void
}

interface FileItem {
  id: string
  type: 'file'
  title: string
  subtitle: string
  icon: typeof Clock
  recent: RecentFile
}

type PaletteItem = CommandItem | FileItem

const open = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const tabs = useTabsStore()
const fileTree = useFileTreeStore()
const sidebar = useSidebarStore()
const theme = useThemeStore()
const recent = useRecentFilesStore()
const workspace = useWorkspaceStore()

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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

const commands = computed<CommandItem[]>(() => {
  const list: CommandItem[] = [
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
      action: () => { sidebar.rightOpen = !sidebar.rightOpen },
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
  return list
})

const recentFileItems = computed<FileItem[]>(() => {
  return recent.files.map((f) => ({
    id: `recent:${f.path}`,
    type: 'file',
    title: f.title,
    subtitle: f.path,
    icon: Clock,
    recent: f,
  }))
})

const allItems = computed<PaletteItem[]>(() => {
  return [...commands.value, ...recentFileItems.value]
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allItems.value.slice(0, 20)
  return allItems.value.filter((item) => {
    const text = [item.title, item.subtitle].join(' ').toLowerCase()
    return text.includes(q)
  }).slice(0, 20)
})

watch(open, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(filtered, () => {
  selectedIndex.value = 0
})

onKeyStroke('p', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
    e.preventDefault()
    if (!workspace.root) return
    open.value = !open.value
  }
})

onKeyStroke('Escape', () => {
  open.value = false
})

function execute(item: PaletteItem) {
  if (item.type === 'command') {
    item.action()
  } else {
    tabs.open(item.recent.path, item.recent.title)
  }
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filtered.value[selectedIndex.value]
    if (item) execute(item)
  }
}
</script>

<template>
  <div>
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[20vh]"
      @click.self="open = false"
    >
      <div class="w-full max-w-xl overflow-hidden rounded-lg border bg-card shadow-lg">
        <div class="flex items-center gap-2 border-b px-3 py-2">
          <span class="text-xs text-muted-foreground">⌘/Ctrl+P</span>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Type a command or recent file..."
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            @keydown="onKeydown"
          >
        </div>
        <ul v-if="filtered.length" class="max-h-[50vh] overflow-y-auto py-1">
          <li
            v-for="(item, idx) in filtered"
            :key="item.id"
            class="cursor-pointer px-3 py-2 text-sm"
            :class="idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'"
            @click="execute(item)"
            @mouseenter="selectedIndex = idx"
          >
            <div class="flex items-center gap-2">
              <component :is="item.icon" class="h-4 w-4 shrink-0 opacity-70" />
              <div class="min-w-0 flex-1">
                <div class="truncate">{{ item.title }}</div>
                <div
                  v-if="item.subtitle"
                  class="truncate text-[11px]"
                  :class="idx === selectedIndex ? 'text-accent-foreground/70' : 'text-muted-foreground'"
                >
                  {{ item.subtitle }}
                </div>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="px-3 py-4 text-center text-sm text-muted-foreground">
          No commands found
        </p>
      </div>
    </div>
  </div>
</template>
