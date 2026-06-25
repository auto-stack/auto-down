<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileTreeStore } from '@/stores/fileTree'

const workspace = useWorkspaceStore()
const fileTree = useFileTreeStore()
const path = ref('')
const busy = ref(false)

async function open() {
  if (!path.value.trim()) return
  busy.value = true
  try {
    await workspace.open(path.value.trim())
    await fileTree.load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center p-8 text-center">
    <h1 class="mb-2 text-3xl font-bold text-emerald-600">Jade Garden</h1>
    <p class="mb-8 text-muted-foreground">An Obsidian-like AutoDown knowledge base editor</p>

    <div class="flex w-full max-w-md gap-2">
      <input
        v-model="path"
        type="text"
        placeholder="Paste a wiki directory path, e.g. D:/notes/my-wiki"
        class="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        @keydown.enter="open"
      />
      <button
        class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        :disabled="busy"
        @click="open"
      >
        Open
      </button>
    </div>
    <p v-if="workspace.error" class="mt-3 text-sm text-destructive">{{ workspace.error }}</p>
  </div>
</template>
