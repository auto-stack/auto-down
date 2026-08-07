<!-- OutgoingLinksPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { tabFileStem, fetchOutlinksSafe, openOutlinkTarget } from '../../auto/src/front/utils/outgoing_links_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/outgoing_links_panel_ext'

const tabsStore = useTabsStore()


const links = ref<any[]>([])
const loading = ref<boolean>(false)

const current_title = computed<any>(() => tabFileStem(tabsStore.activeTab))
const show_loading = computed<boolean>(() => loading.value)
const show_list = computed<boolean>(() => !loading.value && links.value.length > 0)
const show_empty = computed<boolean>(() => !loading.value && links.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  OpenTarget: [any]
}>()

watch(current_title, () => {
  if (current_title.value == '') {links.value = [];
  }
  if (current_title.value != '') {loading.value = true;
  let p = fetchOutlinksSafe(current_title.value);



  p.then((res: any) => { links.value = res;
  loading.value = false;
   });
  }
}, { immediate: true })

function OpenTarget(ol: any): void {
  openOutlinkTarget(ol);

  emit('OpenTarget', ol)
}


</script>

<template>
    <div class="rounded-lg border bg-background/50 p-2.5">
      <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Outgoing links</span>
      </h4>
      <template v-if="show_loading">
        <p class="text-xs text-muted-foreground">
          <span>Loading…</span>
        </p>
      </template>
      <template v-if="show_list">
        <component :is="(ul_tag) as any" class="space-y-0.5">
          <component :is="(li_tag) as any" class="flex cursor-pointer items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground" @click="OpenTarget(ol)" v-for="ol in links">
            <span :class="ol.exists ? 'h-1.5 w-1.5 rounded-full shrink-0 bg-[hsl(var(--af-success))]' : 'h-1.5 w-1.5 rounded-full shrink-0 bg-destructive'" />
            <span class="truncate">
              <span>{{ ol.target_title }}</span>
            </span>
            <template v-if="ol.block_id">
              <span class="text-[10px] text-muted-foreground">
                <span>#{{ ol.block_id }}</span>
              </span>
            </template>
          </component>
        </component>
      </template>
      <template v-if="show_empty">
        <p class="text-xs text-muted-foreground">
          <span>No outgoing links.</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
