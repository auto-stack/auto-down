<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFileTreeStore } from '@/stores/fileTree'
import { useTabsStore } from '@/stores/tabs'
import { Search } from 'lucide-vue-next'

const fileTree = useFileTreeStore()
const tabs = useTabsStore()
const query = ref('')

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
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return allFiles.value.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
})

function openFile(path: string) {
  tabs.open(path)
}
</script>

<template>
  <div class="flex h-full flex-col p-3">
    <div class="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
      <Search class="h-4 w-4 text-muted-foreground" />
      <input
        v-model="query"
        type="text"
        placeholder="Search file names..."
        class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      >
    </div>
    <ul v-if="results.length" class="mt-2 flex-1 space-y-1 overflow-y-auto">
      <li
        v-for="file in results"
        :key="file.path"
        class="cursor-pointer truncate rounded px-2 py-1 text-sm hover:bg-accent"
        @click="openFile(file.path)"
      >
        {{ file.name }}
      </li>
    </ul>
    <p v-else-if="query.trim()" class="mt-4 text-center text-xs text-muted-foreground">
      No results
    </p>
    <p v-else class="mt-4 text-center text-xs text-muted-foreground">
      Type to search
    </p>
  </div>
</template>
