<!-- GraphViewPage.vue — 单元页 graph_view（PLAN-080 T-04：RC-F 真渲染转正）。
     挂载真件 GraphView.vue（cytoscape ext 浏览器域，既有管线零改动）；
     fixture：graph facade 播种三节点两边（全真实 path——edge 端点 = path
     契约域，与 VM twin 同 fixture）→ initGraph 真跑（on_open emit 通道
     不进断言——无 tabs store，077 backlinks 同款口径）。cytoscape 像素面
     由截图基线承载（DOM 无文本 needle）。
     VM 臂 twin：gv_ring_tables 副本（derived-from desktop
     panels_graph_fns.at——049 样板形态）→ canvas 三表 + press(id) 投影。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import GraphView from '../../../src/components/GraphView.vue'
import { useGraphStore } from '../../../src/stores/graph'

const graph = useGraphStore()

onMounted(() => {
  graph.nodes = [
    { id: 'a', label: '引言', path: 'wiki/引言.ad', exists: true, degree: 2 },
    { id: 'b', label: '方法', path: 'wiki/方法.ad', exists: true, degree: 1 },
    { id: 'c', label: '另页', path: 'wiki/另页.ad', exists: true, degree: 1 },
  ]
  graph.edges = [
    { source: 'wiki/引言.ad', target: 'wiki/方法.ad', block_id: null },
    { source: 'wiki/引言.ad', target: 'wiki/另页.ad', block_id: null },
  ]
})
</script>

<template>
  <div class="h-80 p-3" data-unit="graph_view">
    <GraphView :nodes="graph.nodes" :edges="graph.edges" :settings="graph.settings" />
  </div>
</template>
