<!-- FileTree component - Auto-generated from Auto language -->
<script setup lang="ts">
import { promptNewFile, promptNewFolder, Plus, FolderPlus } from '../../auto/src/front/utils/file_tree_ext'
import { useFileTreeStore } from '../../auto/src/front/utils/file_tree_ext'

const fileTreeStore = useFileTreeStore()

import FileTreeNode from '@/components/FileTreeNode.vue'


const emit = defineEmits<{
  NewFile: []
  NewFolder: []
}>()

function NewFolder(): void {
  promptNewFolder(fileTreeStore);

  emit('NewFolder')
}

function NewFile(): void {
  promptNewFile(fileTreeStore);

  emit('NewFile')
}


</script>

<template>
    <div class="flex h-full flex-col">
      <div class="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b px-3">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Files</span>
        </span>
        <div class="flex items-center gap-0.5">
          <button class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :title="'New file'" @click="NewFile">
            <component :is="(Plus) as any" class="h-3.5 w-3.5" />
          </button>
          <button class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :title="'New folder'" @click="NewFolder">
            <component :is="(FolderPlus) as any" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-auto py-1">
        <template v-if="fileTreeStore.loading">
          <div class="p-3 text-sm text-muted-foreground">
            <span>Loading...</span>
          </div>
        </template>
        <FileTreeNode :level="0" :key="node.path" :node="node"  v-for="node in fileTreeStore.files"/>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
