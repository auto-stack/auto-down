<!-- BacklinksPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTabsStore } from '../../auto/src/front/utils/backlinks_panel_ext'

const tabsStore = useTabsStore()

import { get_backlinks } from '../../auto/src/front/utils/backlinks_panel_ext'

const links = ref<any[]>([])
const loading = ref<boolean>(false)

const current_title = computed<any>(() => tab_file_stem(tabsStore.activeTab))
const show_loading = computed<boolean>(() => loading.value)
const show_list = computed<boolean>(() => !loading.value && links.value.length > 0)
const show_empty = computed<boolean>(() => !loading.value && links.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  OpenSource: [any]
}>()

watch(current_title, async () => {

  if (current_title.value == '') {links.value = [];
  }
  if (current_title.value != '') {loading.value = true;
  try {let res = await get_backlinks(current_title.value);
  links.value = res.links;
  } catch (e) {links.value = [];
  } finally {loading.value = false;
  }
  }
}, { immediate: true })

function OpenSource(bl: any): void {
  tabsStore.open(bl.source_path, bl.source_title);

  emit('OpenSource', bl)
}

function last_segment(path: any): string {
  let sep = path.indexOf('/');
  if (sep == -1) {return path;
  }
  return last_segment(path.substring(sep + 1, Number(path.length)));
}

function stem_of_path(path: any): string {
  let name = last_segment(path);
  let dot = name.indexOf('.');
  if (dot > 0) {return name.substring(0, dot);
  }
  return name;
}

function tab_file_stem(tab: any): string {
  if (tab == null) {return '';
  }
  return stem_of_path(tab.path);
}


</script>

<template>
    <div class="rounded-lg border bg-background/50 p-2.5">
      <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Backlinks</span>
      </h4>
      <template v-if="show_loading">
        <p class="text-xs text-muted-foreground">
          <span>Loading…</span>
        </p>
      </template>
      <template v-if="show_list">
        <component :is="(ul_tag) as any" class="space-y-0.5">
          <component :is="(li_tag) as any" class="cursor-pointer truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground" :key="bl.source_path" :title="bl.context" @click="OpenSource(bl)" v-for="bl in links">
            <span>{{ bl.source_title }}</span>
          </component>
        </component>
      </template>
      <template v-if="show_empty">
        <p class="text-xs text-muted-foreground">
          <span>No backlinks.</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
