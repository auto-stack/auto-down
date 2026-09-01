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

<script lang="ts">
// Single table channel (plan 032 P2): this module owns BOTH table faces —
//   · progressive face = the template below (```json {"type":"table"} stream
//     component segments: header-first columns, rows streaming in, loading row)
//   · terminal face = `tablePanel` (view + stream markdown segments through
//     the panel registry's custom slot, plan 026 nodeViewPanel pattern)
// `tablePanel` is the DOM byte contract of the retired builtin-panels
// renderTablePanel — table-node / thead+th(+resize handle) / tbody+td /
// .node-slot-embedded cells — pinned by render.test.ts (zero-change guard)
// and stream-tri-state.test.ts. It is a plain render function, not a
// template branch, because it needs the ctx's renderEmbedded for cell
// content (mounting this SFC per panel render would add nothing).
import { h, type VNode } from 'vue'
import type { PanelRenderCtx, PanelRenderer } from './panel-registry'

function alignClass(cell: any): string {
  if (cell.align === 'center') return 'text-center'
  if (cell.align === 'right') return 'text-right'
  return 'text-left'
}

export const tablePanel: PanelRenderer = ({ node, final, budget, renderEmbedded }: PanelRenderCtx): VNode => {
  return h('table', { class: 'table-node', 'aria-busy': 'false' }, [
    h('thead', {}, [
      h(
        'tr',
        {},
        // plan 019: WNode carries the table header as a 0-or-1 array
        ((node.header ?? [])[0]?.cells ?? []).map((cell: any) =>
          h('th', { dir: 'auto', class: alignClass(cell) }, [
            renderEmbedded(cell.children ?? [], final, budget),
            h('button', { type: 'button', class: 'table-node__resize-handle' }),
          ])
        )
      ),
    ]),
    h(
      'tbody',
      {},
      (node.rows ?? []).map((row: any) =>
        h(
          'tr',
          {},
          (row.cells ?? []).map((cell: any) =>
            h('td', { dir: 'auto', class: alignClass(cell) }, [
              renderEmbedded(cell.children ?? [], final, budget),
            ])
          )
        )
      )
    ),
  ])
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeTableProps } from './streaming-table.generated'

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

// normalization logic lives in auto/streaming_table.at (plan 008, Phase 1);
// `withDefaults` above keeps the component prop defaults, this is the same
// `columns ?? []` / `rows ?? []` belt-and-suspenders as before
const normalized = computed(() => normalizeTableProps(props.columns, props.rows))
const safeColumns = computed(() => normalized.value[0])
const safeRows = computed(() => normalized.value[1])
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
