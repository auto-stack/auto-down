<!-- CommandPalettePage.vue — 单元页 command_palette（PLAN-076 T-03：RC-D
     批次 2 检索/导航族 + 缺件红占位转正）。挂载真件 CommandPalette.vue
     （零副本）；fixture：workspace facade 播种 root（热键 workspace.root
     守卫）+ recentFiles facade 播种 CJK 两行（引言/引子）→ 合成
     Ctrl+P KeyboardEvent 开面板（热键等价驱动）→ gate fill 步骤键入
     "引言" → 下沉 filter_palette（trim/to_lower/contains，P-7 CJK 域）
     过滤 command 九命令 + recent 两行 → recent 行命中渲染（icon 经
     view 双分支注入 Clock，ruling B）。热键/焦点 = window 级 DOM 必留
     ext 域（F-1 口径，twin 不镜像）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import CommandPalette from '../../../src/components/CommandPalette.vue'
import { useWorkspaceStore } from '../../../src/stores/workspace'
import { useRecentFilesStore } from '../../../src/stores/recentFiles'

onMounted(() => {
  const ws = useWorkspaceStore()
  ws.root = 'D:/tmp/wiki-demo'
  const rf = useRecentFilesStore()
  rf.files = [
    { path: 'wiki/引言.ad', title: '引言' },
    { path: 'wiki/方法/引子.ad', title: '引子' },
  ]
  // The widget registers its Init listener before the parent's onMounted
  // fires (children mount first); the synthetic keydown drives the same
  // Ctrl+P branch as the real hotkey.
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true }),
  )
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="command_palette">
    <CommandPalette />
  </div>
</template>
