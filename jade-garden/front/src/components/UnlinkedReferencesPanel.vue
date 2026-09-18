<!-- UnlinkedReferencesPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { highlight_context } from '../../auto/src/front/utils/unlinked_references_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/unlinked_references_panel_ext'

const tabsStore = useTabsStore()

import { get_unlinked_refs } from '../../auto/src/front/utils/unlinked_references_panel_ext'

const refs = ref<any[]>([])
const loading = ref<boolean>(false)

const watch_key = computed<any>(() => tab_path(tabsStore.activeTab))
const show_loading = computed<boolean>(() => loading.value)
const show_list = computed<boolean>(() => !loading.value && refs.value.length > 0)
const show_empty = computed<boolean>(() => !loading.value && refs.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  OpenRef: [any]
}>()

watch(watch_key, async () => {

  let title = tab_title(tabsStore.activeTab);
  if (title == '') {refs.value = [];
  }
  if (title != '') {loading.value = true;
  try {let res = await get_unlinked_refs(title);
  let rows = [];
  for (const r of res.refs) {rows.push({ page_path: r.page_path, html: highlight_context(r.context, r.matched_text) });
  }
  refs.value = rows;
  } catch (e) {refs.value = [];
  } finally {loading.value = false;
  }
  }
}, { immediate: true })

function OpenRef(r: any): void {
  tabsStore.open(r.page_path);

  emit('OpenRef', r)
}

function tab_title(tab: any): string {
  if (tab == null) {return '';
  }
  return tab.title;
}

function tab_path(tab: any): string {
  if (tab == null) {return '';
  }
  return tab.path;
}


</script>

<template>
    <div class="rounded-lg border bg-background/50 p-2.5">
      <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Unlinked References</span>
      </h4>
      <template v-if="show_loading">
        <div class="text-xs text-muted-foreground">
          <span>Loading…</span>
        </div>
      </template>
      <template v-if="show_list">
        <component :is="(ul_tag) as any" class="space-y-1">
          <component :is="(li_tag) as any" class="cursor-pointer rounded px-1.5 py-1 text-xs hover:bg-accent" :key="r.page_path" @click="OpenRef(r)" v-for="r in refs">
            <div class="mb-0.5 truncate text-[10px] text-muted-foreground">
              <span>{{ r.page_path }}</span>
            </div>
            <div class="text-foreground/80" v-html="r.html" />
          </component>
        </component>
      </template>
      <template v-if="show_empty">
        <p class="text-xs text-muted-foreground">
          <span>No unlinked references.</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
