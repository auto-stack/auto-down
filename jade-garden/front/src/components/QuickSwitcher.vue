<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { useFileTreeStore } from '@/stores/fileTree'
import { useTabsStore } from '@/stores/tabs'
import { Search } from 'lucide-vue-next'

const fileTree = useFileTreeStore()
const tabs = useTabsStore()

const open = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

interface FileItem {
  path: string
  name: string
}

function collectFiles(nodes: typeof fileTree.files, items: FileItem[] = []) {
  for (const n of nodes) {
    if (n.is_dir && n.children) {
      collectFiles(n.children, items)
    } else if (!n.is_dir) {
      items.push({ path: n.path, name: n.name })
    }
  }
  return items
}

const allFiles = computed(() => collectFiles(fileTree.files))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allFiles.value.slice(0, 12)
  return allFiles.value
    .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
    .slice(0, 12)
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

function selectFile(path: string) {
  tabs.open(path)
  open.value = false
}

onKeyStroke('o', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    open.value = true
  }
})

onKeyStroke('Escape', () => {
  open.value = false
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const file = filtered.value[selectedIndex.value]
    if (file) selectFile(file.path)
  }
}
</script>

<template>
  <div>
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[20vh]"
      @click.self="open = false"
    >
      <div class="w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-lg">
        <div class="flex items-center gap-2 border-b px-3 py-2">
          <Search class="h-4 w-4 text-muted-foreground" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search files..."
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            @keydown="onKeydown"
          >
          <span class="text-xs text-muted-foreground">Ctrl+O</span>
        </div>
        <ul v-if="filtered.length" class="max-h-[50vh] overflow-y-auto py-1">
          <li
            v-for="(file, idx) in filtered"
            :key="file.path"
            class="cursor-pointer px-3 py-1.5 text-sm"
            :class="idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'"
            @click="selectFile(file.path)"
            @mouseenter="selectedIndex = idx"
          >
            {{ file.name }}
            <span class="ml-2 text-xs text-muted-foreground">{{ file.path }}</span>
          </li>
        </ul>
        <p v-else class="px-3 py-4 text-center text-sm text-muted-foreground">
          No files found
        </p>
      </div>
    </div>
  </div>
</template>
