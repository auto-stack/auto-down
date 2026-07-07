<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-vue-next'
import { useFileTreeStore } from '@/stores/fileTree'
import { useTabsStore } from '@/stores/tabs'
import type { FileNode } from '@/lib/api'

const props = defineProps<{ node: FileNode; level?: number }>()

const fileTree = useFileTreeStore()
const tabs = useTabsStore()
const level = computed(() => props.level ?? 0)
const isExpanded = computed(() => fileTree.expanded.has(props.node.path))
const isActive = computed(() => tabs.activePath === props.node.path)

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function toggle() {
  if (props.node.is_dir) {
    fileTree.toggle(props.node.path)
  } else {
    tabs.open(props.node.path, props.node.name.replace(/\.ad$/, ''))
  }
}

function onRightClick(e: MouseEvent) {
  e.preventDefault()
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
}

async function createFile() {
  closeMenu()
  const base = props.node.is_dir ? props.node.path : (props.node.path.split('/').slice(0, -1).join('/') || '')
  const name = window.prompt('New file name:', 'Untitled.ad')
  if (!name) return
  const path = base ? `${base}/${name}` : name
  await fileTree.createFile(path, false)
}

async function createFolder() {
  closeMenu()
  const base = props.node.is_dir ? props.node.path : (props.node.path.split('/').slice(0, -1).join('/') || '')
  const name = window.prompt('New folder name:', 'New Folder')
  if (!name) return
  const path = base ? `${base}/${name}` : name
  await fileTree.createFile(path, true)
}

async function renameItem() {
  closeMenu()
  const name = window.prompt('Rename to:', props.node.name)
  if (!name || name === props.node.name) return
  const base = props.node.path.split('/').slice(0, -1).join('/') || ''
  const newPath = base ? `${base}/${name}` : name
  await fileTree.renameFile(props.node.path, newPath)
}

async function duplicateItem() {
  closeMenu()
  const parts = props.node.path.split('/')
  const name = parts[parts.length - 1]
  const base = parts.slice(0, -1).join('/') || ''
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const newName = `${stem} (copy)${ext}`
  const newPath = base ? `${base}/${newName}` : newName
  await fileTree.duplicateFile(props.node.path, newPath)
}

async function deleteItem() {
  closeMenu()
  const ok = confirm(`Delete "${props.node.name}"?`)
  if (!ok) return
  await fileTree.deleteFile(props.node.path)
}

function clickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.file-context-menu')) {
    closeMenu()
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', clickOutside, { once: true })
}
</script>

<template>
  <div>
    <div
      class="group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors"
      :class="[
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-accent hover:text-foreground',
      ]"
      :style="{ marginLeft: `${level * 12}px`, marginRight: '6px' }"
      @click="toggle"
      @contextmenu="onRightClick"
    >
      <span class="flex h-4 w-4 items-center justify-center text-muted-foreground/70">
        <ChevronRight v-if="node.is_dir && !isExpanded" class="h-3.5 w-3.5" />
        <ChevronDown v-else-if="node.is_dir && isExpanded" class="h-3.5 w-3.5" />
      </span>
      <component
        :is="node.is_dir ? (isExpanded ? FolderOpen : Folder) : FileText"
        class="h-3.5 w-3.5 shrink-0"
        :class="[
          node.is_dir
            ? 'text-muted-foreground/70'
            : isActive ? 'text-primary' : 'text-muted-foreground',
        ]"
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

    <teleport to="body">
      <div
        v-if="menuOpen"
        class="file-context-menu absolute z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md"
        :style="{ left: `${menuX}px`, top: `${menuY}px` }"
      >
        <button
          class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent"
          @click="createFile"
        >
          New file
        </button>
        <button
          class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent"
          @click="createFolder"
        >
          New folder
        </button>
        <button
          class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent"
          @click="renameItem"
        >
          Rename
        </button>
        <button
          class="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent"
          @click="duplicateItem"
        >
          Duplicate
        </button>
        <div class="my-1 h-px bg-border" />
        <button
          class="flex w-full items-center rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10"
          @click="deleteItem"
        >
          Delete
        </button>
      </div>
    </teleport>
  </div>
</template>
