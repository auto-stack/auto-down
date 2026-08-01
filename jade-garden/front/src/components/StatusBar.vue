<!-- StatusBar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWorkspaceStore, useTabsStore } from '../../auto/src/front/utils/status_bar_ext'
import { workspaceName, rootTitle, tabBody, tabPath, tabSaving, tabDirty, wordCount, charCount, linkCount, saveLabel, plural, fetchBacklinkCountSafe } from '../../auto/src/front/utils/status_bar_ext'

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()


const backlink_count = ref<number>(0)

const ws_name = computed<any>(() => workspaceName(workspaceStore.root))
const ws_title = computed<any>(() => rootTitle(workspaceStore.root))
const body = computed<any>(() => tabBody(tabsStore.activeTab))
const word_count = computed<any>(() => wordCount(body.value))
const char_count = computed<any>(() => charCount(body.value))
const link_count = computed<any>(() => linkCount(body.value))
const saving = computed<any>(() => tabSaving(tabsStore.activeTab))
const dirty = computed<any>(() => tabDirty(tabsStore.activeTab))
const save_label = computed<any>(() => saveLabel(saving.value, dirty.value))
const current_path = computed<any>(() => tabPath(tabsStore.activeTab))
const backlinks_text = computed<any>(() => plural(backlink_count.value, 'backlink'))
const words_text = computed<any>(() => plural(word_count.value, 'word'))
const chars_text = computed<any>(() => plural(char_count.value, 'char'))
const links_text = computed<any>(() => plural(link_count.value, 'link'))
const tabs_text = computed<any>(() => plural(tabsStore.tabs.length, 'tab'))

watch(current_path, () => {

  if (current_path.value == '') {backlink_count.value = 0;
  }
  if (current_path.value != '') {let p = fetchBacklinkCountSafe(current_path.value);


  p.then((n: any) => { backlink_count.value = n;
   });
  }
}, { immediate: true })


</script>

<template>
    <footer class="flex h-6 shrink-0 items-center justify-between border-t bg-card px-3 text-[11px] text-muted-foreground">
      <div class="flex items-center gap-3">
        <span class="truncate max-w-[240px]" :title="ws_title">
          <span>{{ ws_name }}</span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span :class="dirty ? 'text-amber-500' : ''">
          <span>{{ save_label }}</span>
        </span>
        <span class="text-border">
          <span>|</span>
        </span>
        <span>
          <span>{{ backlinks_text }}</span>
        </span>
        <span>
          <span>{{ words_text }}</span>
        </span>
        <span>
          <span>{{ chars_text }}</span>
        </span>
        <span>
          <span>{{ links_text }}</span>
        </span>
        <span>
          <span>{{ tabs_text }}</span>
        </span>
      </div>
    </footer>

</template>

<style>
/* Component styles */

</style>
