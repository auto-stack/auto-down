<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { AutoDownEditor } from '@autodown/editor'
import { useTabsStore } from '@/stores/tabs'
import { useFileTreeStore } from '@/stores/fileTree'
import { createWikiPage } from '@/lib/api'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const fileTree = useFileTreeStore()
const tab = computed(() => tabs.tabs.find(t => t.path === props.path))
const body = computed(() => tab.value?.body ?? '')

watch(() => props.path, () => {
  if (tab.value && !tab.value.loaded) {
    tabs.load(props.path)
  }
}, { immediate: true })

const debouncedSave = useDebounceFn(() => {
  if (tab.value?.dirty) tabs.save(props.path)
}, 2000)

function onUpdate(md: string) {
  tabs.setBody(props.path, md)
  debouncedSave()
}

async function onOpenWikiLink(title: string, blockId?: string | null) {
  // Ensure the file tree is loaded so we can resolve existing pages.
  if (!fileTree.files.length && !fileTree.loading) {
    await fileTree.load()
  }

  // Resolve title to an existing .ad file path (case-insensitive, based on file stem).
  const targetName = `${title}.ad`
  let targetPath: string | undefined

  function search(nodes: any[]): string | undefined {
    for (const node of nodes) {
      if (!node.is_dir && node.name.toLowerCase() === targetName.toLowerCase()) {
        return node.path
      }
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return undefined
  }

  targetPath = search(fileTree.files)

  if (!targetPath) {
    const ok = confirm(`页面 "${title}" 还不存在，是否创建？`)
    if (!ok) return
    try {
      targetPath = await createWikiPage(title)
      await fileTree.load()
    } catch (e) {
      alert(`创建页面失败：${e}`)
      return
    }
  }

  await tabs.open(targetPath, title)
  // TODO: scroll to blockId after the new tab finishes rendering.
  if (blockId) {
    console.log('jump to block', blockId)
  }
}
</script>

<template>
  <div class="editor-workspace">
    <!-- Only mount the editor for the active document tab to avoid Tiptap unmount issues. -->
    <AutoDownEditor
      :content="body"
      placeholder="Start typing..."
      :show-actions="false"
      class="h-full w-full"
      @update="onUpdate"
      @open-wiki-link="onOpenWikiLink"
    />
    <div
      v-show="!tab?.loaded"
      class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-muted-foreground"
    >
      Loading…
    </div>
  </div>
</template>

<style scoped>
.editor-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.editor-workspace :deep(.autodown-editor) {
  border: none;
  border-radius: 0;
  background: transparent;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.editor-workspace :deep(.autodown-editor-content-wrapper) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}
</style>
