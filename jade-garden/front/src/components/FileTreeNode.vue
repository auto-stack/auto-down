<script setup lang="ts">
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-vue-next'
import { computed } from 'vue'
import { useFileTreeStore } from '@/stores/fileTree'
import { useTabsStore } from '@/stores/tabs'
import type { FileNode } from '@/lib/api'

const props = defineProps<{ node: FileNode; level?: number }>()

const fileTree = useFileTreeStore()
const tabs = useTabsStore()
const level = computed(() => props.level ?? 0)
const isExpanded = computed(() => fileTree.expanded.has(props.node.path))
const isActive = computed(() => tabs.activePath === props.node.path)

function toggle() {
  if (props.node.is_dir) {
    fileTree.toggle(props.node.path)
  } else {
    tabs.open(props.node.path, props.node.name.replace(/\.ad$/, ''))
  }
}
</script>

<template>
  <div>
    <div
      class="flex cursor-pointer items-center gap-1 py-1 pr-2 text-sm hover:bg-accent/50"
      :class="{ 'bg-accent/80 text-accent-foreground': isActive }"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
      @click="toggle"
    >
      <span class="flex h-4 w-4 items-center justify-center text-muted-foreground">
        <ChevronRight v-if="node.is_dir && !isExpanded" class="h-4 w-4" />
        <ChevronDown v-else-if="node.is_dir && isExpanded" class="h-4 w-4" />
      </span>
      <component
        :is="node.is_dir ? (isExpanded ? FolderOpen : Folder) : FileText"
        class="h-4 w-4 shrink-0"
        :class="node.is_dir ? 'text-muted-foreground' : 'text-emerald-600'"
      />
      <span class="truncate">{{ node.name }}</span>
    </div>
    <div v-if="node.is_dir && isExpanded && node.children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
      />
    </div>
  </div>
</template>
