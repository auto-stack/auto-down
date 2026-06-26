<script setup lang="ts">
import { computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { AutoDownEditor } from '@autodown/editor'
import { useTabsStore } from '@/stores/tabs'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const tab = computed(() => tabs.tabs.find(t => t.path === props.path))
const body = computed(() => tab.value?.body ?? '')

const debouncedSave = useDebounceFn(() => {
  if (tab.value?.dirty) tabs.save(props.path)
}, 2000)

function onUpdate(md: string) {
  tabs.setBody(props.path, md)
  debouncedSave()
}
</script>

<template>
  <div class="editor-workspace">
    <AutoDownEditor
      :content="body"
      placeholder="Start typing..."
      :show-actions="false"
      class="h-full w-full"
      @update="onUpdate"
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
