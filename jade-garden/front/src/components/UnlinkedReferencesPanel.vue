<!-- UnlinkedReferencesPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { tabTitle, tabPath, fetchUnlinkedSafe } from '../../auto/src/front/utils/unlinked_references_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/unlinked_references_panel_ext'

const tabsStore = useTabsStore()


const refs = ref<any[]>([])
const loading = ref<boolean>(false)

const watch_key = computed<any>(() => tabPath(tabsStore.activeTab))
const show_loading = computed<boolean>(() => loading.value)
const show_list = computed<boolean>(() => !loading.value && refs.value.length > 0)
const show_empty = computed<boolean>(() => !loading.value && refs.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  OpenRef: [any]
}>()

watch(watch_key, () => {

  let title = tabTitle(tabsStore.activeTab);
  if (title == '') {refs.value = [];
  }
  if (title != '') {loading.value = true;
  let p = fetchUnlinkedSafe(title);
  p.then((res: any) => { refs.value = res;
  loading.value = false;
   });
  }
}, { immediate: true })

function OpenRef(r: any): void {
  tabsStore.open(r.page_path);

  emit('OpenRef', r)
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
          <component :is="(li_tag) as any" class="cursor-pointer rounded px-1.5 py-1 text-xs hover:bg-accent" @click="OpenRef(r)" v-for="r in refs">
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
