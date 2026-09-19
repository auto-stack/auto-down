<!-- GraphSidebarPage.vue — 单元页 graph_sidebar（PLAN-078 T-01：RC-D 批次 4）。
     挂载真件 GraphSidebar.vue（零副本）；fixture：graph facade 播种四节点
     三边（CJK 标题 + exists 双态 + degree 0 孤儿）→ 真 .Init（nodes 非空
     守卫跳过 load）→ 下沉 graph_stats 四卡（页面/链接/缺失/孤立）+
     top_degree_nodes 选排 cap 行（display = label||id 显式 if——空 label
     行回落 id 面）。行 click（tabs.open）不进断言（077 backlinks 同款）。
     VM 臂 twin：gs_stats/gs_top_nodes derived 副本真跑（G-3 各持一份），
     四卡计数投影 + 行 needle。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import GraphSidebar from '../../../src/components/GraphSidebar.vue'
import { useGraphStore } from '../../../src/stores/graph'

onMounted(() => {
  const graph = useGraphStore()
  graph.nodes = [
    { id: 'a', label: '引言', path: 'wiki/引言.ad', exists: true, degree: 3 },
    { id: 'b', label: '', path: 'wiki/方法.ad', exists: true, degree: 1 },
    { id: 'c', label: '缺失页', path: '', exists: false, degree: 2 },
    { id: 'd', label: '孤儿页', path: 'wiki/孤儿.ad', exists: true, degree: 0 },
  ]
  graph.edges = [
    { source: 'a', target: 'b', block_id: null },
    { source: 'a', target: 'c', block_id: null },
    { source: 'c', target: 'b', block_id: null },
  ]
})
</script>

<template>
  <div class="flex h-80 flex-col p-3" data-unit="graph_sidebar">
    <GraphSidebar />
  </div>
</template>
