<!-- BacklinksPage.vue — 单元页 backlinks（PLAN-072 T-03 样板③数据绑定）。
     挂载真件 BacklinksPanel.vue（零副本）；fixture：open 一页 → 面板自身
     的 current_title watch 发起 backlinks 拉取 → shim 应答 1 条反链 →
     数据绑定行渲染（source_title）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import BacklinksPanel from '../../../src/components/BacklinksPanel.vue'
import { useTabsStore } from '../../../src/stores/tabs'

onMounted(async () => {
  const tabs = useTabsStore()
  await tabs.open('wiki/引言.ad', '引言')
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="backlinks">
    <BacklinksPanel />
  </div>
</template>
