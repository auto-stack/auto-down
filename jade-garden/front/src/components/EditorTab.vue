<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn, onKeyStroke } from '@vueuse/core'
import { AutoDownEditor } from '@autodown/editor'
import { StreamingRenderer } from '@autodown/vue'
import { useTabsStore } from '@/stores/tabs'
import { useFileTreeStore } from '@/stores/fileTree'
import { transformWikiLinks, wikiTitleToPath, parseWikiLinks } from '@/lib/wikiLink'
import { createWikiPage } from '@/lib/api'
import { useSyncedScroll } from '@/composables/useSyncedScroll'
import CreatePagePrompt from './CreatePagePrompt.vue'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const fileTree = useFileTreeStore()
const tab = computed(() => tabs.tabs.find(t => t.path === props.path))

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<InstanceType<typeof AutoDownEditor> | null>(null)
const rendererRef = ref<InstanceType<typeof StreamingRenderer> | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

useSyncedScroll({
  workspaceRef,
  editorRef,
  rendererRef,
})

const body = computed(() => tab.value?.body ?? '')

function fileStem(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

const existingTitles = computed(() => {
  const set = new Set<string>()
  function walk(nodes: typeof fileTree.files) {
    for (const n of nodes) {
      if (!n.is_dir) set.add(fileStem(n.name))
      if (n.children) walk(n.children)
    }
  }
  walk(fileTree.files)
  return set
})

const previewSource = computed(() => {
  return transformWikiLinks(body.value, (title) => existingTitles.value.has(title))
})

const debouncedSave = useDebounceFn(() => {
  if (tab.value?.dirty) tabs.save(props.path)
}, 2000)

function onUpdate(md: string) {
  tabs.setBody(props.path, md)
  debouncedSave()
}

function onSave(md: string) {
  tabs.setBody(props.path, md)
  tabs.save(props.path)
}

onKeyStroke('s', (e) => {
  if ((e.ctrlKey || e.metaKey) && tab.value?.dirty) {
    e.preventDefault()
    tabs.save(props.path)
  }
})

watch(() => props.path, () => {
  if (tab.value && !tab.value.loaded) tabs.load(props.path)
}, { immediate: true })

// WikiLink click handling on the preview pane.
const pendingWikiLink = ref<{ title: string; blockId?: string } | null>(null)

function resolveWikiHref(href: string): { title: string; blockId?: string } | null {
  try {
    const url = new URL(href)
    if (url.protocol !== 'wiki:') return null
    const title = decodeURIComponent(url.hostname + url.pathname)
    const blockId = url.hash ? decodeURIComponent(url.hash.slice(1)) : undefined
    return title ? { title, blockId } : null
  } catch {
    return null
  }
}

async function openWikiLink(title: string, blockId?: string) {
  const path = wikiTitleToPath(title)
  await tabs.open(path, title)
  if (blockId) {
    // Scroll to block in preview is handled by StreamingRenderer's data-block-id.
    // TODO: scroll editor/preview to block id.
    console.log('scroll to', blockId)
  }
}

function onPreviewClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest?.('a[href^="wiki://"]') as HTMLAnchorElement | null
  if (!anchor) return
  event.preventDefault()
  const resolved = resolveWikiHref(anchor.href)
  if (!resolved) return
  const exists = existingTitles.value.has(resolved.title)
  if (exists) {
    openWikiLink(resolved.title, resolved.blockId)
  } else {
    pendingWikiLink.value = resolved
  }
}

async function confirmCreatePage() {
  if (!pendingWikiLink.value) return
  const { title } = pendingWikiLink.value
  try {
    const path = await createWikiPage(title)
    await fileTree.load()
    await tabs.open(path, title)
  } finally {
    pendingWikiLink.value = null
  }
}

onMounted(() => {
  if (!tab.value?.loaded) tabs.load(props.path)
})
</script>

<template>
  <div v-if="!tab?.loaded" class="flex h-full items-center justify-center text-muted-foreground">
    Loading…
  </div>
  <div v-else ref="workspaceRef" class="editor-workspace">
    <div class="editor-panels">
      <section class="editor-panel editor-panel-left">
        <AutoDownEditor
          ref="editorRef"
          :content="body"
          placeholder="Start typing..."
          :show-actions="false"
          class="h-full"
          @update="onUpdate"
          @save="onSave"
        />
      </section>
      <div class="editor-divider" />
      <section ref="rightPanelRef" class="editor-panel editor-panel-right" @click="onPreviewClick">
        <StreamingRenderer
          ref="rendererRef"
          :source="previewSource"
          :streaming="false"
          class="h-full"
        />
      </section>
    </div>

    <CreatePagePrompt
      :open="pendingWikiLink !== null"
      :title="pendingWikiLink?.title ?? ''"
      @create="confirmCreatePage"
      @cancel="pendingWikiLink = null"
    />
  </div>
</template>

<style scoped>
.editor-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-panels {
  display: flex;
  height: 100%;
  width: 100%;
}

.editor-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-panel-left :deep(.autodown-editor) {
  border: none;
  border-radius: 0;
  height: 100%;
}

.editor-panel-left :deep(.autodown-editor-content-wrapper) {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.editor-panel-left :deep(.autodown-editor-content-wrapper)::-webkit-scrollbar {
  display: none;
}

.editor-panel-right :deep(.streaming-document) {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 1rem 1.25rem;
  display: flow-root;
}

.editor-panel-right :deep(.streaming-document)::-webkit-scrollbar {
  display: none;
}

.editor-divider {
  width: 1px;
  background: hsl(var(--border));
  flex-shrink: 0;
}
</style>

<style>
.wikilink {
  color: hsl(220 90% 56%);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.wikilink.dangling {
  color: hsl(0 70% 50%);
  text-decoration-style: dashed;
}
.wikilink:hover {
  opacity: 0.8;
}
</style>
