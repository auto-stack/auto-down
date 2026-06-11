<template>
  <div class="streaming-table" :class="{ final }">
    <table>
      <thead>
        <tr>
          <th v-for="col in safeColumns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in safeRows" :key="idx">
          <td v-for="col in safeColumns" :key="col">{{ row[col] ?? '' }}</td>
        </tr>
        <tr v-if="!final" class="loading-row">
          <td :colspan="Math.max(1, safeColumns.length)">
            <span class="loading-dots">Loading</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    columns?: string[]
    rows?: Record<string, any>[]
    final?: boolean
  }>(),
  {
    columns: () => [],
    rows: () => [],
    final: false,
  }
)

const safeColumns = computed(() => props.columns ?? [])
const safeRows = computed(() => props.rows ?? [])
</script>

<style scoped>
.streaming-table {
  margin: 0.75rem 0;
  overflow-x: auto;
}

.streaming-table table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.95rem;
}

.streaming-table th,
.streaming-table td {
  border: 1px solid #e5e7eb;
  padding: 0.9rem 0.6rem;
  text-align: left;
}

.streaming-table th {
  background: hsl(220 9% 46% / 0.06);
  font-weight: 600;
  color: #111827;
}

.streaming-table td {
  color: #111827;
}

.streaming-table tr:nth-child(even) {
  background: #f9fafb;
}

.streaming-table .loading-row td {
  color: #6b7280;
  font-style: italic;
  text-align: center;
}

.loading-dots::after {
  content: '';
  animation: dots 1.4s infinite both;
}

@keyframes dots {
  0%, 80%, 100% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
}
</style>
