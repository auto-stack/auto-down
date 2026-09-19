<!-- RecentFilesPage.vue — 单元页 recent_files（PLAN-077 T-02：RC-D 批次 3）。
     挂载真件 RecentFilesPanel.vue（零副本）；fixture：recentFiles facade
     播种两行（CJK 标题 + openedAt 时间戳）→ 下沉 recent_files_with_time
     行构造（time 字段经 ext formatTime 桥逐行预计算——Q-3，locale 域
     文本不作 needle，行 title/path 承载断言）。click 门：ClearAll 按钮
     → 真 store.clear() 通道 → 空态文案出现（正向 needle）。VM 臂 twin：
     rf_count/rf_remove 投影（derived 播种——formatTime TS 域不入 VM，
     F-1 口径）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import RecentFilesPanel from '../../../src/components/RecentFilesPanel.vue'
import { useRecentFilesStore } from '../../../src/stores/recentFiles'

onMounted(() => {
  const rf = useRecentFilesStore()
  rf.files = [
    { path: 'wiki/引言.ad', title: '引言', openedAt: Date.now() },
    { path: 'wiki/另页.ad', title: '另页', openedAt: Date.now() - 3_600_000 },
  ]
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="recent_files">
    <RecentFilesPanel />
  </div>
</template>
