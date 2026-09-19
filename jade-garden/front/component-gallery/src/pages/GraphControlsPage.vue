<!-- GraphControlsPage.vue — 单元页 graph_controls（PLAN-078 T-02：RC-D 批次 4）。
     挂载真件 GraphControls.vue（零副本）；fixture：graph facade 播种
     （centerPath 暴露局部图谱节 + settings textOpacity 0.4/nodeSize 9 偏离
     默认——重置行为可断言）→ 下沉 gc_center_label（strip_ext 纪律形态，
     vue 执行面剥 .ad 后缀）+ gc_opacity_label（math.round 40%）+ RangeInput
     九滑条（P-12 必留）。click 门：重置设置 → 下沉 gc_reset_settings
     （逐字段点号写 P-11 安全形 + saveSettings）→ opacity 回 85%。
     VM 臂 twin：gc_center_label/gc_opacity_label derived 副本真跑（ASCII
     域——G-2 CJK 剥除 VM 退化不镜像）+ gc_reset 驱动 40%→85% 投影 +
     checkbox 词位在位（P-13）。 -->
<script setup lang="ts">
import GraphControls from '../../../src/components/GraphControls.vue'
import { useGraphStore } from '../../../src/stores/graph'

const graph = useGraphStore()
graph.centerPath = 'wiki/引言.ad'
graph.depth = 2
graph.settings = {
  showOrphans: false,
  showMissing: false,
  nodeSize: 9,
  textOpacity: 0.4,
  edgeWidth: 1,
  showArrows: false,
  gravity: 0.05,
  repulsion: 4500,
  attraction: 0.05,
  linkLength: 120,
}
</script>

<template>
  <div class="flex h-96 flex-col p-3" data-unit="graph_controls">
    <GraphControls />
  </div>
</template>
