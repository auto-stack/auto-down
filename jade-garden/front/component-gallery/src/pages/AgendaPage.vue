<!-- AgendaPage.vue — 单元页 agenda（PLAN-077 T-02：RC-D 批次 3）。挂载真件
     AgendaPanel.vue（零副本）；fixture：gate 无输入——面板自身
     current_path watch immediate → 下沉 try/catch/finally 经 get_agenda
     契约别名拉取 → shim 应答两组三任务（TODO/DONE/DOING marker 三态 +
     priority [#2] + title 空串回落 page_path 显式守卫面 + title 非空
     直下面）→ agenda_display 行构造渲染（formatted_date 经 ext formatDate
     桥——Q-3，locale 域不作 needle）。VM 臂 twin：ag_display_probe
     derived 副本真跑行构造（to_upper if-chain——P-7 对称词位 VM 面），
     日期 raw 投影。 -->
<script setup lang="ts">
import AgendaPanel from '../../../src/components/AgendaPanel.vue'
</script>

<template>
  <div class="flex flex-1 flex-col p-3" data-unit="agenda">
    <AgendaPanel />
  </div>
</template>
