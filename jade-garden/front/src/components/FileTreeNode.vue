<!-- FileTreeNode component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NodeIcon, ChevronRight, ChevronDown, isNodeExpanded, px, nodeIndent, openNodeFile, ctxNewFile, ctxNewFolder, ctxRename, ctxDuplicate, ctxDelete, listenFirstClickOutside } from '../../auto/src/front/utils/file_tree_node_ext'
import { useFileTreeStore, useTabsStore } from '../../auto/src/front/utils/file_tree_node_ext'

const fileTreeStore = useFileTreeStore()
const tabsStore = useTabsStore()

import FileTreeNode from '@/components/FileTreeNode.vue'


const menu_open = ref<boolean>(false)
const menu_x = ref<number>(0)
const menu_y = ref<number>(0)

const is_expanded = computed<any>(() => isNodeExpanded(fileTreeStore, props.node.path))
const is_active = computed<boolean>(() => tabsStore.activePath === props.node.path)
const show_right = computed<boolean>(() => props.node.is_dir && !is_expanded.value)
const show_down = computed<boolean>(() => props.node.is_dir && is_expanded.value)
const show_children = computed<boolean>(() => props.node.is_dir && is_expanded.value && props.node.children != null)
const next_level = computed<number>(() => props.level + 1)
const indent_left = computed<any>(() => nodeIndent(props.level))
const menu_left = computed<any>(() => px(menu_x.value))
const menu_top = computed<any>(() => px(menu_y.value))

const props = defineProps<{
  node: FileNode
  level: number
}>()

const emit = defineEmits<{
  Toggle: []
  RightClick: [any]
  CtxNewFile: []
  CtxNewFolder: []
  CtxRename: []
  CtxDuplicate: []
  CtxDelete: []
}>()

import type { FileNode } from '@/lib/api'

function CtxNewFile(): void {
  menu_open.value = false;
  ctxNewFile(fileTreeStore, props.node);

  emit('CtxNewFile')
}

function CtxNewFolder(): void {
  menu_open.value = false;
  ctxNewFolder(fileTreeStore, props.node);

  emit('CtxNewFolder')
}

function Toggle(): void {
  if (props.node.is_dir) {fileTreeStore.toggle(props.node.path);
  }
  if (!props.node.is_dir) {openNodeFile(tabsStore, props.node);
  }

  emit('Toggle')
}

function CtxRename(): void {
  menu_open.value = false;
  ctxRename(fileTreeStore, props.node);

  emit('CtxRename')
}

function RightClick(e: any): void {
  menu_x.value = e.clientX;
  menu_y.value = e.clientY;
  menu_open.value = true;

  emit('RightClick', e)
}

function CtxDuplicate(): void {
  menu_open.value = false;
  ctxDuplicate(fileTreeStore, props.node);

  emit('CtxDuplicate')
}

function CtxDelete(): void {
  menu_open.value = false;
  ctxDelete(fileTreeStore, props.node);

  emit('CtxDelete')
}

onMounted(() => {
  let close_menu = () => { menu_open.value = false;
   };
  listenFirstClickOutside(close_menu);
})


</script>

<template>
    <div>
      <div :class="is_active ? 'group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors bg-primary/10 text-primary' : 'group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors text-foreground hover:bg-accent hover:text-foreground'" :style="({ marginLeft: indent_left, marginRight: '6px' } as any)" @click="Toggle" @contextmenu.prevent="RightClick($event)">
        <span class="flex h-4 w-4 items-center justify-center text-muted-foreground/70">
          <template v-if="show_right">
            <component :is="(ChevronRight) as any" class="h-3.5 w-3.5" />
          </template>
          <template v-if="show_down">
            <component :is="(ChevronDown) as any" class="h-3.5 w-3.5" />
          </template>
        </span>
        <component :is="(NodeIcon) as any" :is_dir="node.is_dir" :expanded="is_expanded" :active="is_active" />
        <span class="truncate">
          <span>{{ node.name }}</span>
        </span>
      </div>
      <template v-if="show_children">
        <FileTreeNode :key="child.path" :node="child" :level="next_level"  v-for="child in node.children"/>
      </template>
      <Teleport to="body">
        <template v-if="menu_open">
          <div class="file-context-menu absolute z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md" :style="({ left: menu_left, top: menu_top } as any)">
            <button class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent" @click="CtxNewFile">
              <span>New file</span>
            </button>
            <button class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent" @click="CtxNewFolder">
              <span>New folder</span>
            </button>
            <button class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent" @click="CtxRename">
              <span>Rename</span>
            </button>
            <button class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent" @click="CtxDuplicate">
              <span>Duplicate</span>
            </button>
            <div class="my-1 h-px bg-border" />
            <button class="flex w-full items-center rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10" @click="CtxDelete">
              <span>Delete</span>
            </button>
          </div>
        </template>
      </Teleport>
    </div>

</template>

<style>
/* Component styles */

</style>
