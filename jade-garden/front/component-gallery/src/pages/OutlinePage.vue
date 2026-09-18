<!-- OutlinePage.vue — 单元页 outline（PLAN-072 T-01 样板②交互/列表）。
     挂载真件 src/components/OutlinePanel.vue（生产构建产物，零副本）。
     fixture：tabs.open() 打开 fixture 页 → blocks facade 的 immediate
     watch 解析入 cache → OutlinePanel 的 headings 列表路径点亮
     （app 内该面 pinned-empty——隔离面解锁，见 072-inventory §7）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import OutlinePanel from '../../../src/components/OutlinePanel.vue'
import { useTabsStore } from '../../../src/stores/tabs'
import { useBlocksStore } from '../../../src/stores/blocks'

onMounted(async () => {
  const tabs = useTabsStore()
  const blocks = useBlocksStore()
  await tabs.open('wiki/引言.ad', '引言')
  // fixture 播种走显式 parse：blocks.ts 的 activeTab watch 因 Open 原地
  // 改 tab 对象（引用不变）不重触发——生产侧该路径本就 pinned-empty
  // （072-inventory §3 注），gallery 不依赖它。
  const path = tabs.activePath
  const body = tabs.activeTab?.body
  if (path && typeof body === 'string') blocks.parse(path, body)
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-3 p-3" data-unit="outline">
    <OutlinePanel />
  </div>
</template>
