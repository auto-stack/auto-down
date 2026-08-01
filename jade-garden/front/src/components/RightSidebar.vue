<!-- RightSidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { AgendaPanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { BacklinksPanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { GraphSidebar } from '../../auto/src/front/utils/right_sidebar_ext'
import { OutgoingLinksPanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { OutlinePanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { PropertiesPanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { UnlinkedReferencesPanel } from '../../auto/src/front/utils/right_sidebar_ext'
import { tabIsGraph } from '../../auto/src/front/utils/right_sidebar_ext'
import { useTabsStore } from '../../auto/src/front/utils/right_sidebar_ext'

const tabsStore = useTabsStore()


const is_graph = computed<any>(() => tabIsGraph(tabsStore.activeTab))


</script>

<template>
    <aside class="flex w-64 flex-col gap-3 overflow-y-auto border-l bg-card p-3 text-sm">
      <template v-if="is_graph">
        <GraphSidebar :key="'GraphSidebar-1'" />
      </template>
      <template v-if="! is_graph">
        <AgendaPanel :key="'AgendaPanel-2'" />
        <OutlinePanel :key="'OutlinePanel-3'" />
        <BacklinksPanel :key="'BacklinksPanel-4'" />
        <OutgoingLinksPanel :key="'OutgoingLinksPanel-5'" />
        <UnlinkedReferencesPanel :key="'UnlinkedReferencesPanel-6'" />
        <PropertiesPanel :key="'PropertiesPanel-7'" />
      </template>
    </aside>

</template>

<style>
/* Component styles */

</style>
