<!-- CreatePagePromptPage.vue — 单元页 create_page_prompt（PLAN-077 T-01：RC-D
     批次 3 极薄件首验）。挂载真件 CreatePagePrompt.vue（零副本）；fixture：
     title/open 双 prop 播种 → page_path 投影（wikiTitleToPath 经 ext 桥——
     regex 单源 wikiLink.ts，双轨不可镜像域）+ 双按钮（Create/Cancel emit
     契约——orphan 组件无消费者，头注在案）。VM 臂 twin：cpp_path/cpp_choice
     投影（derived 值播种——regex 桥 TS 域不入 VM，F-1 口径）。 -->
<script setup lang="ts">
import CreatePagePrompt from '../../../src/components/CreatePagePrompt.vue'
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="create_page_prompt">
    <CreatePagePrompt title="引言" :open="true" />
  </div>
</template>
