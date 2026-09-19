<!-- ThemePopoverPage.vue — 单元页 theme_popover（PLAN-077 T-01：RC-D 批次 3，
     Q-4 字面量下沉首件）。挂载真件 ThemePopover.vue（零副本）；fixture：
     open prop 播种 + theme facade mode/accent 初始值 → teleport 弹层
     （DOM 落 body 层，needle 走 .theme-popover 选择器）→ sunk theme_accents
     静态五 accent 列表渲染（Q-4 探针同形——VM Obj 字面量全键形状锁定域）。
     SetLight/SetDark/SetAccent 按钮 = 真 store 通道（交互投影断言归 VM 臂
     twin——vue 臂 needleSelector 不及 class 域）。 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import ThemePopover from '../../../src/components/ThemePopover.vue'
import { useThemeStore } from '../../../src/stores/theme'

onMounted(() => {
  const theme = useThemeStore()
  theme.mode = 'light'
  theme.accent = 'indigo'
})
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="theme_popover">
    <ThemePopover :open="true" />
  </div>
</template>
