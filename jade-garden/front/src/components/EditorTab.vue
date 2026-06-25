<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDebounceFn, onKeyStroke } from '@vueuse/core'
import { AutoDownEditor } from '@autodown/editor'
import { StreamingRenderer } from '@autodown/vue'
import { useTabsStore } from '@/stores/tabs'
import { useSyncedScroll } from '@/composables/useSyncedScroll'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const tab = computed(() => tabs.tabs.find(t => t.path === props.path))

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<InstanceType<typeof AutoDownEditor> | null>(null)
const rendererRef = ref<InstanceType<typeof StreamingRenderer> | null>(null)

useSyncedScroll({
  workspaceRef,
  editorRef,
  rendererRef,
})

const body = computed(() => tab.value?.body ?? '')

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
      <section class="editor-panel editor-panel-right">
        <StreamingRenderer
          ref="rendererRef"
          :source="body"
          :streaming="false"
          class="h-full"
        />
      </section>
    </div>
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
