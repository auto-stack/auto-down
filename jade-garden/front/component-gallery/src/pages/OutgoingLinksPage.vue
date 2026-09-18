<!-- OutgoingLinksPage.vue — 单元页 outgoing_links（PLAN-074 T-03·RC-D 批次1）。
     挂载真件 OutgoingLinksPanel.vue（零副本）；fixture：open 一页 → 面板
     自身 current_title watch（下沉 tab_file_stem 链路）发起 outlinks 拉取
     → shim 应答 2 条（exists: true+block_id / exists: false）→ 行渲染
     （状态点 class 三元 + #block_id 后缀）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import OutgoingLinksPanel from '../../../src/components/OutgoingLinksPanel.vue'
import { useTabsStore } from '../../../src/stores/tabs'

onMounted(async () => {
  const tabs = useTabsStore()
  await tabs.open('wiki/引言.ad', '引言')
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="outgoing_links">
    <OutgoingLinksPanel />
  </div>
</template>
