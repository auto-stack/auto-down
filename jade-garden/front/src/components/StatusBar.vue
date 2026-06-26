<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import { getBacklinks } from '@/lib/api'

const workspace = useWorkspaceStore()
const tabs = useTabsStore()

const workspaceName = computed(() => {
  if (!workspace.root) return 'No workspace'
  const parts = workspace.root.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || workspace.root
})

const body = computed(() => tabs.activeTab?.body ?? '')
const wordCount = computed(() => {
  const text = body.value.trim()
  if (!text) return 0
  return text.split(/\s+/).length
})
const charCount = computed(() => body.value.length)
const linkCount = computed(() => (body.value.match(/\[\[/g) || []).length)

const saving = computed(() => tabs.activeTab?.saving)
const dirty = computed(() => tabs.activeTab?.dirty)
const saveLabel = computed(() => {
  if (saving.value) return 'Saving…'
  if (dirty.value) return 'Unsaved'
  return 'Saved'
})

function fileStem(path: string): string {
  const name = path.split('/').pop() || path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

const backlinkCount = ref(0)
async function fetchBacklinks() {
  const path = tabs.activeTab?.path
  if (!path) {
    backlinkCount.value = 0
    return
  }
  try {
    const res = await getBacklinks(fileStem(path))
    backlinkCount.value = res.links.length
  } catch {
    backlinkCount.value = 0
  }
}

watch(() => tabs.activeTab?.path, fetchBacklinks, { immediate: true })
</script>

<template>
  <footer class="flex h-6 shrink-0 items-center justify-between border-t bg-card px-3 text-[11px] text-muted-foreground">
    <div class="flex items-center gap-3">
      <span class="truncate max-w-[240px]" :title="workspace.root ?? undefined">
        {{ workspaceName }}
      </span>
    </div>
    <div class="flex items-center gap-3">
      <span :class="dirty ? 'text-amber-500' : ''">{{ saveLabel }}</span>
      <span class="text-border">|</span>
      <span>{{ backlinkCount }} backlink{{ backlinkCount === 1 ? '' : 's' }}</span>
      <span>{{ wordCount }} words</span>
      <span>{{ charCount }} chars</span>
      <span>{{ linkCount }} link{{ linkCount === 1 ? '' : 's' }}</span>
      <span>{{ tabs.tabs.length }} tab{{ tabs.tabs.length === 1 ? '' : 's' }}</span>
    </div>
  </footer>
</template>
