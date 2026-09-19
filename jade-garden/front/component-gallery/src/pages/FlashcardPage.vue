<!-- FlashcardPage.vue — 单元页 flashcard_modal（PLAN-077 T-03：RC-D 批次 3）。
     挂载真件 FlashcardModal.vue（零副本）；fixture：open prop 播种 →
     .Init → 下沉 try/catch/finally 经 get_due_cards 契约别名拉取 →
     shim 应答两卡（question/answer/raw 三域）→ counter_label 计数投影
     （f-string 数学内插——P-3）+ card_question 显式守卫投影。click 门：
     Reveal 按钮 → show_answer 翻转（.Reveal 直写）→ answer 域 + 评级按钮
     出现。VM 臂 twin：fm_card_at derived 副本（计数走查）+ fm_reveal/
     fm_rate 按钮驱动 index 前移投影（契约 shim 面归 vue 臂，twin 不镜像
     ——F-1）。 -->
<script setup lang="ts">
import FlashcardModal from '../../../src/components/FlashcardModal.vue'
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="flashcard_modal">
    <FlashcardModal :open="true" />
  </div>
</template>
