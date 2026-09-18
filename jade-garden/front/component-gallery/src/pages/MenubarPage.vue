<!-- MenubarPage.vue — 单元页 menubar+toolbar（PLAN-073 T-02 ①-3/①-4）。
     挂载真件 src/components/MenuBar.vue（ui_config 合成件）。T-00 落点
     复核：toolbar 是 menu_bar.at 的第二 view 块，渲染在 MenuBar.vue 内
     （menubar 兄弟块），无独立 SFC——本页即双面单元（菜单面 + 工具栏面）。
     命令面无 fixture 依赖：menu_bar_ext.ts 全部行为守卫式 no-op（无
     workspace/活动 tab 时不触发），静态渲染 store 无关。 -->
<script setup lang="ts">
import MenuBar from '../../../src/components/MenuBar.vue'
</script>

<template>
  <div class="flex flex-1 flex-col" data-unit="menubar">
    <MenuBar />
    <div class="flex flex-1 items-center justify-center text-[13px] text-zinc-400">
      menubar 单元（真件挂载 · ui_config 合成面 menubar+toolbar）
    </div>
  </div>
</template>
