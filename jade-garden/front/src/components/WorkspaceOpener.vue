<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen } from 'lucide-vue-next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileTreeStore } from '@/stores/fileTree'

const workspace = useWorkspaceStore()
const fileTree = useFileTreeStore()
const path = ref('')
const busy = ref(false)
const pickerRef = ref<HTMLInputElement | null>(null)

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

function chooseDirectory() {
  pickerRef.value?.click()
}

function onPickerChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const first = files[0]
  // Desktop wrappers (Tauri/Electron) expose the absolute file path.
  const absPath = (first as any).path as string | undefined
  if (absPath) {
    // The selected directory is the parent of the first file.
    const lastSep = absPath.replace(/\\/g, '/').lastIndexOf('/')
    if (lastSep > 0) {
      path.value = absPath.slice(0, lastSep)
      open()
      return
    }
  }

  // Fallback: use the root directory name from the relative path.
  const rel = first.webkitRelativePath || ''
  const rootName = rel.split('/')[0]
  if (rootName) {
    path.value = rootName
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center p-8 text-center">
    <h1 class="mb-2 text-3xl font-bold text-emerald-600">Jade Garden</h1>
    <p class="mb-8 text-muted-foreground">An Obsidian-like AutoDown knowledge base editor</p>

    <div class="flex w-full max-w-md gap-2">
      <button
        type="button"
        title="Choose folder"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        @click="chooseDirectory"
      >
        <FolderOpen class="h-5 w-5" />
      </button>
      <input
        ref="pickerRef"
        type="file"
        webkitdirectory
        directory
        class="hidden"
        @change="onPickerChange"
      >
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
    <p class="mt-2 max-w-md text-xs text-muted-foreground">
      点击左侧文件夹图标可选择目录。浏览器安全限制下可能无法获取绝对路径，此时请手动在输入框中补全完整路径后打开。
    </p>
  </div>
</template>
