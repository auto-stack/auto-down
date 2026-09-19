<!-- QuickSwitcherPage.vue — 单元页 quick_switcher（PLAN-076 T-01：RC-D
     批次 2 检索/导航族）。挂载真件 QuickSwitcher.vue（零副本）；fixture：
     fileTree facade 直播种嵌套树（含 CJK 名 + 目录递归面）→ 经 widget 自身
     的 'jade-open-quick-switcher' window 通道开面板（热键等价驱动）→
     collect_files 递归 walk + filter_files 空查询全量行（cap 12）渲染。
     键盘导航/热键/焦点 = window 级 DOM 必留 ext 域（F-1 口径，twin 不镜像）；
     过滤/选中投影断言在 VM 臂 twin（qs_count/qs_selected，CJK fixture——
     T-00 P-7 裁定）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import QuickSwitcher from '../../../src/components/QuickSwitcher.vue'
import { useFileTreeStore } from '../../../src/stores/fileTree'

onMounted(() => {
  const ft = useFileTreeStore()
  ft.files = [
    {
      name: 'wiki',
      path: 'wiki',
      is_dir: true,
      children: [
        { name: '引言.ad', path: 'wiki/引言.ad', is_dir: false, children: [] },
        {
          name: '方法',
          path: 'wiki/方法',
          is_dir: true,
          children: [
            { name: '引子.ad', path: 'wiki/方法/引子.ad', is_dir: false, children: [] },
            { name: '探针.ad', path: 'wiki/方法/探针.ad', is_dir: false, children: [] },
          ],
        },
      ],
    },
    { name: '另页.ad', path: 'wiki/另页.ad', is_dir: false, children: [] },
  ]
  // The widget registers its Init listener before the parent's onMounted
  // fires (children mount first), so the external-open event lands.
  window.dispatchEvent(new CustomEvent('jade-open-quick-switcher'))
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="quick_switcher">
    <QuickSwitcher />
  </div>
</template>
