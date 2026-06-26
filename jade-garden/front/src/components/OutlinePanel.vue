<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'

interface Heading {
  level: number
  text: string
  line: number
}

function parseHeadings(body: string): Heading[] {
  const headings: Heading[] = []
  const lines = body.split('\n')
  lines.forEach((line, idx) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (!match) return
    headings.push({ level: match[1].length, text: match[2].trim(), line: idx })
  })
  return headings
}

const tabs = useTabsStore()
const headings = computed(() => parseHeadings(tabs.activeTab?.body ?? ''))
</script>

<template>
  <div class="rounded-lg border bg-background/50 p-2.5">
    <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outline</h4>
    <ul v-if="headings.length" class="space-y-0.5">
      <li
        v-for="h in headings"
        :key="h.line"
        class="cursor-pointer truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        :style="{ paddingLeft: `${(h.level - 1) * 0.6 + 0.375}rem` }"
        :title="h.text"
      >
        {{ h.text }}
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No headings.</p>
  </div>
</template>
