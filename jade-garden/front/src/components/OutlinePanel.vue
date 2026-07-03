<script setup lang="ts">
import { computed } from 'vue'
import { useBlocksStore } from '@/stores/blocks'

const blocks = useBlocksStore()
const headings = computed(() => blocks.activeBlocks.filter((b) => b.kind === 'heading'))
</script>

<template>
  <div class="rounded-lg border bg-background/50 p-2.5">
    <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outline</h4>
    <ul v-if="headings.length" class="space-y-0.5">
      <li
        v-for="h in headings"
        :key="h.lineStart"
        class="cursor-pointer truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        :style="{ paddingLeft: `${(Number(h.content.match(/^#{1,6}/)?.[0].length ?? 1) - 1) * 0.6 + 0.375}rem` }"
        :title="h.content"
      >
        {{ h.content.replace(/^#+\s+/, '') }}
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No headings.</p>
  </div>
</template>
