<!-- PropertiesPanelPage.vue — 单元页 properties_panel（PLAN-077 T-05 压轴）。
     挂载真件 PropertiesPanel.vue（零副本）；fixture：generated tabs store
     直播种（tabs.push + active_path——facade 无 tabs setter，generated
     composable 直用）→ activeTab fixture 携五型 frontmatter（text/boolean/
     date/number/list——inferType 分派域全覆盖）→ 下沉 sync_entries 行构造
     （P-9 map 迭代 vue 执行面 + inferType 逐值桥）→ with_prop_display 就地
     字段写渲染。click 门：bool pill（true 标签钮）→ ToggleBool 翻转 →
     'false' 标签出现（正向 needle；is_dirty 按钮面随现）。VM 臂 twin：
     pp_rows 播种（inferType TS 域不入 VM——分派型 derived 播种，F-1）+
     pp_toggle/pp_add 按钮驱动翻转/增行投影。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import PropertiesPanel from '../../../src/components/PropertiesPanel.vue'
import { useTabsStore as useGenTabsStore } from '../../../src/stores/auto/useTabsStore'

onMounted(() => {
  const g = useGenTabsStore()
  g.tabs.value.push({
    path: 'wiki/引言.ad',
    title: '引言',
    body: '# 引言\n\n正文一段（fixture）。',
    originalBody: '# 引言\n\n正文一段（fixture）。',
    frontmatter: {
      title: '引言',
      published: true,
      date: '2026-09-19',
      count: 42,
      tags: ['a', 'b'],
    },
  })
  g.active_path.value = 'wiki/引言.ad'
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="properties_panel">
    <PropertiesPanel />
  </div>
</template>
