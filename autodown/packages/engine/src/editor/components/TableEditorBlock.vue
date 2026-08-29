<template>
  <div
    class="autodown-table-editor"
    :data-block-id="ctx.blockId"
    data-node-type="Table"
    :class="{ 'is-readonly': ctx.readonly }"
  >
    <div v-if="ctx.readonly" class="autodown-stream-banner">流式生成中</div>
    <div class="te-toolbar" role="toolbar" aria-label="表格工具栏">
      <button type="button" class="te-btn" data-te-action="add-row" title="在末尾后插入一行" :disabled="ctx.readonly" @click="controller.addRow()">+ 行</button>
      <button type="button" class="te-btn" data-te-action="delete-row" title="删除最后一行" :disabled="ctx.readonly" @click="controller.deleteRow()">− 行</button>
      <button type="button" class="te-btn" data-te-action="add-col" title="追加一列" :disabled="ctx.readonly" @click="controller.addColumn()">+ 列</button>
      <button type="button" class="te-btn" data-te-action="delete-col" title="删除最后一列" :disabled="ctx.readonly" @click="controller.deleteColumn()">− 列</button>
    </div>
    <table class="table-node" aria-busy="false">
      <thead>
        <tr>
          <th
            v-for="cell in headerRow.children"
            :key="cell.id"
            dir="auto"
            :class="alignClass(cell)"
            :data-cell-id="cell.id"
            :contenteditable="!ctx.readonly"
            spellcheck="false"
            @blur="onCellBlur"
          >{{ controller.cellText(cell.id) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in bodyRows" :key="row.id">
          <td
            v-for="cell in row.children"
            :key="cell.id"
            dir="auto"
            :class="alignClass(cell)"
            :data-cell-id="cell.id"
            :contenteditable="!ctx.readonly"
            spellcheck="false"
            @blur="onCellBlur"
          >{{ controller.cellText(cell.id) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
// plan 023 P1T6: the typed editing face for tables. Row/column commands go
// through commands.ts (one undo step each); cell text follows the BlockHost
// protocol — the focused cell's DOM owns its text, blur commits via
// TableEditorController.commitCell (diffToOp). Registered at the assembly
// (EngineEditor plain script block, P1T8 registration step lives next to the
// Fence one). DOM mirrors the render pipeline's table-node contract so the
// shared table CSS applies unchanged.
import { attrGetStr } from '../../parser/block-model'
import type { BlockNode } from '../../parser/block-model'

function alignClass(cell: BlockNode): string {
  const align = attrGetStr(cell.attrs, 'align', 'left')
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

export default { alignClass }
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlockEditCtx } from '../../render/block-component'
import { TableEditorController } from '../engine/table-editor-controller'

const props = defineProps<{ node: BlockNode; ctx: BlockEditCtx }>()

const controller = new TableEditorController(props.ctx.engine, props.ctx.blockId)

const headerRow = computed(() => props.node.children[0])
const bodyRows = computed(() => props.node.children.slice(1))

function onCellBlur(ev: FocusEvent): void {
  if (props.ctx.readonly) return
  const el = ev.target as HTMLElement
  const cellId = el.dataset?.cellId
  if (cellId) controller.commitCell(cellId, el.innerText.replace(/\n+$/, ''))
}
</script>

<style scoped>
.autodown-table-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.autodown-table-editor.is-readonly {
  opacity: 0.75;
}

.autodown-stream-banner {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #92400e;
  background: #fef3c7;
  border-bottom: 1px solid #fcd34d;
  user-select: none;
}

.te-toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: hsl(220 9% 46% / 0.06);
  border-bottom: 1px solid #e5e7eb;
}

.te-btn {
  padding: 0.15rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  font-size: 0.8rem;
  line-height: 1.4;
  cursor: pointer;
}

.te-btn:hover:not(:disabled) {
  background: hsl(220 9% 46% / 0.1);
}

.te-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.autodown-table-editor :deep(td[contenteditable='true']),
.autodown-table-editor :deep(th[contenteditable='true']) {
  outline: none;
  cursor: text;
}

.autodown-table-editor :deep(td[contenteditable='true']:focus),
.autodown-table-editor :deep(th[contenteditable='true']:focus) {
  box-shadow: inset 0 0 0 1.5px #6366f1;
  border-radius: 2px;
}
</style>
