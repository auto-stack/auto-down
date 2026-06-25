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
  <div>
    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outline</h4>
    <ul v-if="headings.length" class="space-y-1">
      <li
        v-for="h in headings"
        :key="h.line"
        class="cursor-pointer truncate rounded px-1 py-0.5 hover:bg-accent"
        :style="{ paddingLeft: `${(h.level - 1) * 0.75 + 0.25}rem` }"
        :title="h.text"
      >
        {{ h.text }}
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No headings.</p>
  </div>
</template>
