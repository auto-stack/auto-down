<!-- App.vue — gallery vue 臂壳（PLAN-072 T-01）。
     单元路由 = ?unit= 查询参数（gate 深链接口径）；真件 SFC 每单元一页。 -->
<script setup lang="ts">
import { ref } from 'vue'
import StatusBarPage from './pages/StatusBarPage.vue'
import OutlinePage from './pages/OutlinePage.vue'

const unit = ref(new URLSearchParams(location.search).get('unit') ?? 'status_bar')

function select(u: string) {
  unit.value = u
  history.replaceState(null, '', `?unit=${u}`)
}
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <header class="flex h-9 shrink-0 items-center gap-2 border-b px-3">
      <span class="text-xs font-semibold text-zinc-700">component-gallery · vue 臂（真件 SFC）</span>
      <button
        data-unit-tab="status_bar"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'status_bar' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('status_bar')"
      >
        status_bar
      </button>
      <button
        data-unit-tab="outline"
        class="rounded px-1.5 text-[11px] hover:bg-accent"
        :class="unit === 'outline' ? 'text-foreground' : 'text-zinc-400'"
        @click="select('outline')"
      >
        outline
      </button>
      <span class="ml-auto text-[11px] text-zinc-400" data-current-unit>{{ unit }}</span>
    </header>
    <StatusBarPage v-if="unit === 'status_bar'" />
    <OutlinePage v-else-if="unit === 'outline'" />
  </div>
</template>
