<!-- SearchPanelPage.vue — 单元页 search_panel（PLAN-076 T-02：RC-D 批次 2
     检索/导航族）。挂载真件 SearchPanel.vue（零副本）；fixture：gate fill
     步骤向输入框键入 CJK 查询"引言" → 面板自身 .Init 建的 debounce 闭包
     （250ms）→ 下沉 watch 闭包体 try/catch/finally 经 search_pages 契约
     通道拉取 → shim 应答两行（Page 带 \u0001/\u0002 snippet 标记经 ext
     regex 桥、Block 无 snippet）→ with_search_display 行构造渲染。
     VM 臂 twin：Init 播种行投影（074 Q-2 口径）。 -->
<script setup lang="ts">
import SearchPanel from '../../../src/components/SearchPanel.vue'
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="search_panel">
    <SearchPanel />
  </div>
</template>
