<!-- OutlinePanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { outlineHeadings, dispatchScrollToHeading } from '../../auto/src/front/utils/outline_panel_ext'
import { useBlocksStore, useTabsStore } from '../../auto/src/front/utils/outline_panel_ext'

const blocksStore = useBlocksStore()
const tabsStore = useTabsStore()


const headings = computed<any>(() => outlineHeadings(blocksStore.activeBlocks))
const show_list = computed<boolean>(() => headings.value.length > 0)
const show_empty = computed<boolean>(() => headings.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  ScrollTo: [any]
}>()

function ScrollTo(content: any): void {
  dispatchScrollToHeading(content);

  emit('ScrollTo', content)
}


</script>

<template>
    <div class="rounded-lg border bg-background/50 p-2.5">
      <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Outline</span>
      </h4>
      <template v-if="show_list">
        <component :is="(ul_tag) as any" class="space-y-0.5">
          <component :is="(li_tag) as any" class="cursor-pointer truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground" :title="h.content" :style="({ paddingLeft: h.pad } as any)" @click="ScrollTo(h.content)" v-for="h in headings">
            <span>{{ h.content }}</span>
          </component>
        </component>
      </template>
      <template v-if="show_empty">
        <p class="text-xs text-muted-foreground">
          <span>No headings.</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
