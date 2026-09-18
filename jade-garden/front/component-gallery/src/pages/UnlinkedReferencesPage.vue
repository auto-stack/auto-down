<!-- UnlinkedReferencesPage.vue — 单元页 unlinked_references（PLAN-074
     T-03·RC-D 批次1）。挂载真件 UnlinkedReferencesPanel.vue（零副本）；
     fixture：open 一页 → 面板自身 watch_key watch（下沉 tab_path/tab_title
     链路）发起 unlinked 拉取 → shim 应答 1 条 → 行渲染（page_path +
     highlight_context 预计算的 v-html 高亮）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import UnlinkedReferencesPanel from '../../../src/components/UnlinkedReferencesPanel.vue'
import { useTabsStore } from '../../../src/stores/tabs'

onMounted(async () => {
  const tabs = useTabsStore()
  await tabs.open('wiki/引言.ad', '引言')
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="unlinked_references">
    <UnlinkedReferencesPanel />
  </div>
</template>
