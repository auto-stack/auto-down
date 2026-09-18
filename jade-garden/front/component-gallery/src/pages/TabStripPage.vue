<!-- TabStripPage.vue — 单元页 tab_strip（PLAN-072 T-03 样板②交互）。
     挂载真件 TabStrip.vue（零副本）；fixture 两页经 shim open，交互门 =
     点击第二标签 → 切换生效（data-active-path 投影随 store 变化）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import TabStrip from '../../../src/components/TabStrip.vue'
import { useTabsStore } from '../../../src/stores/tabs'

const tabs = useTabsStore()

onMounted(async () => {
  await tabs.open('wiki/引言.ad', '引言')
  await tabs.open('wiki/方法.ad', '方法')
})
</script>

<template>
  <div class="flex flex-1 flex-col" data-unit="tab_strip">
    <div class="p-3 text-[13px] text-zinc-500">
      tab_strip 单元（真件挂载 · 双 fixture 页）—
      <span data-active-path>{{ tabs.activePath }}</span>
    </div>
    <TabStrip />
  </div>
</template>
