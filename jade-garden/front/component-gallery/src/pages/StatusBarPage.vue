<!-- StatusBarPage.vue — 单元页 status_bar（PLAN-072 T-01 样板①纯展示）。
     挂载真件 src/components/StatusBar.vue（生产构建产物，零副本）；
     fixture：workspace.root 直播种 + tabs.open() 经 fixture shim 打开
     fixture 页（backlink 计数走 shim 的 /api/backlinks）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import StatusBar from '../../../src/components/StatusBar.vue'
import { useWorkspaceStore } from '../../../src/stores/workspace'
import { useTabsStore } from '../../../src/stores/tabs'

onMounted(async () => {
  const ws = useWorkspaceStore()
  ws.root = 'D:/tmp/wiki-demo'
  const tabs = useTabsStore()
  await tabs.open('wiki/引言.ad', '引言')
})
</script>

<template>
  <div class="flex flex-1 flex-col" data-unit="status_bar">
    <div class="flex flex-1 items-center justify-center text-[13px] text-zinc-400">
      status_bar 单元（真件挂载 · fixture 工作区）
    </div>
    <StatusBar />
  </div>
</template>
