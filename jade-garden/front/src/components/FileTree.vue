<script setup lang="ts">
import { Plus, FolderPlus } from 'lucide-vue-next'
import { useFileTreeStore } from '@/stores/fileTree'
import FileTreeNode from './FileTreeNode.vue'

const fileTree = useFileTreeStore()

async function createFile() {
  const name = window.prompt('New file name:', 'Untitled.ad')
  if (!name) return
  await fileTree.createFile(name, false)
}

async function createFolder() {
  const name = window.prompt('New folder name:', 'New Folder')
  if (!name) return
  await fileTree.createFile(name, true)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b px-3">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Files</span>
      <div class="flex items-center gap-0.5">
        <button
          title="New file"
          class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="createFile"
        >
          <Plus class="h-3.5 w-3.5" />
        </button>
        <button
          title="New folder"
          class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="createFolder"
        >
          <FolderPlus class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
    <div class="flex-1 overflow-auto py-1">
      <div v-if="fileTree.loading" class="p-3 text-sm text-muted-foreground">Loading...</div>
      <FileTreeNode
        v-for="node in fileTree.files"
        :key="node.path"
        :node="node"
      />
    </div>
  </div>
</template>
