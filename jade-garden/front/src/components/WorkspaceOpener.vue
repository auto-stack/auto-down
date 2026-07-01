<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen, Info } from 'lucide-vue-next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileTreeStore } from '@/stores/fileTree'

const workspace = useWorkspaceStore()
const fileTree = useFileTreeStore()
const path = ref('')
const busy = ref(false)
const pathInput = ref<HTMLInputElement | null>(null)

async function open() {
  if (!path.value.trim()) return
  busy.value = true
  workspace.error = null
  try {
    await workspace.open(path.value.trim())
    await fileTree.load()
  } finally {
    busy.value = false
  }
}

async function chooseDirectory() {
  const showDirectoryPicker = (window as any).showDirectoryPicker as
    | (() => Promise<{ name: string }>)
    | undefined

  if (!showDirectoryPicker) {
    pathInput.value?.focus()
    pathInput.value?.select()
    return
  }

  try {
    const handle = await showDirectoryPicker()
    path.value = handle.name
    pathInput.value?.focus()
  } catch {
    // User cancelled the picker.
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
          title="选择文件夹"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="chooseDirectory"
        >
          <FolderOpen class="h-5 w-5" />
        </button>
        <input
          ref="pathInput"
          v-model="path"
          type="text"
          placeholder="粘贴完整目录路径，例如 D:\\wiki\\demo"
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

      <div class="mt-4 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div class="leading-relaxed">
          浏览器安全限制下无法直接获取本地文件夹的绝对路径。建议直接在上面的输入框中粘贴完整的工程目录路径；点击文件夹图标可浏览并自动填充目录名，随后请补全完整路径。
        </div>
      </div>
    </div>
  </div>
</template>
