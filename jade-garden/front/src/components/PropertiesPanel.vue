<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'

const tabs = useTabsStore()
const entries = computed(() => {
  const fm = tabs.activeTab?.frontmatter
  if (!fm) return []
  return Object.entries(fm)
})
</script>

<template>
  <div>
    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h4>
    <table v-if="entries.length" class="w-full text-xs">
      <tbody>
        <tr v-for="[key, value] in entries" :key="key" class="border-b last:border-0">
          <td class="py-1 pr-2 font-medium text-muted-foreground">{{ key }}</td>
          <td class="py-1 text-foreground">{{ Array.isArray(value) ? value.join(', ') : String(value) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="text-xs text-muted-foreground">No frontmatter properties.</p>
  </div>
</template>
