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
  const absPath = (first as any).path as string | undefined
  if (absPath) {
    const lastSep = absPath.replace(/\\/g, '/').lastIndexOf('/')
    if (lastSep > 0) {
      path.value = absPath.slice(0, lastSep)
      open()
      return
    }
  }

  const rel = first.webkitRelativePath || ''
  const rootName = rel.split('/')[0]
  if (rootName) {
    path.value = rootName
  }
}
</script>

<template>
  <div class="flex h-full items-center justify-center bg-background p-6">
    <div class="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
      <div class="mb-6 text-center">
        <div class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Jade Garden</h1>
        <p class="mt-1 text-sm text-muted-foreground">A clean knowledge base editor for AutoDown</p>
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          title="Choose folder"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
          placeholder="Paste a wiki directory path..."
          class="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition-shadow focus:ring-2"
          @keydown.enter="open"
        >
        <button
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          :disabled="busy"
          @click="open"
        >
          Open
        </button>
      </div>

      <p v-if="workspace.error" class="mt-3 text-center text-xs text-destructive">{{ workspace.error }}</p>
      <p class="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        点击文件夹图标可选择目录。浏览器安全限制下可能无法获取绝对路径，此时请手动补全完整路径。
      </p>
    </div>
  </div>
</template>
