<!-- TableEditorBlock component - Auto-generated from Auto language -->
<script setup lang="ts">
import { commitTableCell } from '../ext/table_editor_block_ext'


const props = defineProps<{
  controller: any
  blockId: string
  readonly: boolean
  header_cells: any
  body_rows: any
}>()

const emit = defineEmits<{
  AddRow: []
  DeleteRow: []
  AddColumn: []
  DeleteColumn: []
  CellBlur: [any]
}>()

function AddColumn(): void {
  let c = props.controller;
  c.addColumn();

  emit('AddColumn')
}

function AddRow(): void {
  let c = props.controller;
  c.addRow();

  emit('AddRow')
}

function CellBlur(e: any): void {
  if (!props.readonly) {let c = props.controller;
  commitTableCell(c, e);
  }

  emit('CellBlur', e)
}

function DeleteColumn(): void {
  let c = props.controller;
  c.deleteColumn();

  emit('DeleteColumn')
}

function DeleteRow(): void {
  let c = props.controller;
  c.deleteRow();

  emit('DeleteRow')
}


</script>

<template>
    <div class="autodown-table-editor" :class="{ 'is-readonly': readonly }" :data-block-id="blockId" :data-node-type="'Table'">
      <template v-if="readonly">
        <div class="autodown-stream-banner">
          <span>流式生成中</span>
        </div>
      </template>
      <div class="te-toolbar" :aria-label="'表格工具栏'" :role="'toolbar'">
        <button class="te-btn" :data-te-action="'add-row'" :disabled="readonly" :title="'在末尾后插入一行'" :type="'button'" @click="AddRow">
          <span>+ 行</span>
        </button>
        <button class="te-btn" :data-te-action="'delete-row'" :disabled="readonly" :title="'删除最后一行'" :type="'button'" @click="DeleteRow">
          <span>− 行</span>
        </button>
        <button class="te-btn" :data-te-action="'add-col'" :disabled="readonly" :title="'追加一列'" :type="'button'" @click="AddColumn">
          <span>+ 列</span>
        </button>
        <button class="te-btn" :data-te-action="'delete-col'" :disabled="readonly" :title="'删除最后一列'" :type="'button'" @click="DeleteColumn">
          <span>− 列</span>
        </button>
      </div>
      <table class="table-node" :aria-busy="'false'">
        <thead>
          <tr>
            <th :class="cell.cls" :contenteditable="readonly == false" :data-cell-id="cell.id" :dir="'auto'" :key="cell.id" :spellcheck="'false'" @blur="CellBlur($event)" v-for="(cell, h_i) in header_cells">
              <span>{{ cell.text }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr :key="row.id" v-for="(row, r_i) in body_rows">
            <td :class="cell.cls" :contenteditable="readonly == false" :data-cell-id="cell.id" :dir="'auto'" :key="cell.id" :spellcheck="'false'" @blur="CellBlur($event)" v-for="(cell, c_i) in row.cells">
              <span>{{ cell.text }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

</template>

<style>
/* Component styles */

</style>

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
        .autodown-table-editor td[contenteditable='true'],
        .autodown-table-editor th[contenteditable='true'] {
          outline: none;
          cursor: text;
        }
        .autodown-table-editor td[contenteditable='true']:focus,
        .autodown-table-editor th[contenteditable='true']:focus {
          box-shadow: inset 0 0 0 1.5px #6366f1;
          border-radius: 2px;
        }
    </style>
