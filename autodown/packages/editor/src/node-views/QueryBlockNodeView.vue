<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'

interface QueryResult {
  page_path: string
  title: string
  marker: string
  priority?: string
  content: string
  scheduled?: string
  deadline?: string
}

const props = defineProps<NodeViewProps>()

const query = computed(() => (props.node.attrs.query as string) || '')
const results = ref<QueryResult[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const runner = computed(() => (props.extension.options as any)?.runQuery as ((q: string) => Promise<{ results: QueryResult[] }>) | undefined)

async function load() {
  const run = runner.value
  if (!run || !query.value) {
    error.value = 'No query runner configured'
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await run(query.value)
    results.value = res.results || []
  } catch (e: any) {
    error.value = e.message || String(e)
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(() => query.value, load, { immediate: true })
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="autodown-query-block"
    data-query-block
  >
    <div class="query-header">
      <span class="query-label">Query</span>
      <code class="query-code">{{ query }}</code>
    </div>
    <div v-if="loading" class="query-state">Loading query…</div>
    <div v-else-if="error" class="query-state query-error">{{ error }}</div>
    <ul v-else-if="results.length" class="query-results">
      <li v-for="(result, idx) in results" :key="idx" class="query-result">
        <span class="result-marker">{{ result.marker }}</span>
        <span v-if="result.priority" class="result-priority">[#{{ result.priority }}]</span>
        <span class="result-content">{{ result.content }}</span>
        <span class="result-source">{{ result.title || result.page_path }}</span>
      </li>
    </ul>
    <div v-else class="query-state">No results</div>
  </NodeViewWrapper>
</template>

<style scoped>
.autodown-query-block {
  border: 1px solid hsl(var(--border, 220 13% 91%));
  border-radius: 0.375rem;
  background: hsl(var(--card, 0 0% 100%));
  padding: 0.75rem;
  margin: 0.5rem 0;
}
.query-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.query-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--primary, 238 55% 58%));
}
.query-code {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground, 220 9% 46%));
  background: hsl(var(--muted, 210 20% 96%));
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}
.query-state {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground, 220 9% 46%));
}
.query-error {
  color: hsl(var(--destructive, 0 72% 51%));
}
.query-results {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.query-result {
  font-size: 0.8rem;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.result-marker {
  font-weight: 600;
  color: hsl(var(--primary, 238 55% 58%));
}
.result-priority {
  font-weight: 600;
  color: hsl(var(--amber-600, 45 93% 47%));
}
.result-content {
  flex: 1;
  color: hsl(var(--foreground, 224 64% 33%));
}
.result-source {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground, 220 9% 46%));
}
</style>
