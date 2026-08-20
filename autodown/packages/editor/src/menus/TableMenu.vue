<!-- TableMenu component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowDownToLine } from 'lucide-vue-next'
import { ArrowLeftToLine } from 'lucide-vue-next'
import { ArrowRightToLine } from 'lucide-vue-next'
import { ArrowUpToLine } from 'lucide-vue-next'
import { Eraser } from 'lucide-vue-next'
import { Trash2 } from 'lucide-vue-next'
import { X } from 'lucide-vue-next'
import { computeMenuPosition, tableMenuTitles } from '../auto/src/front/utils/table_menu_ext'
import { nextTick } from 'vue'


const visible = ref<boolean>(false)
const pos_top = ref<string>('')
const pos_left = ref<string>('')
const pos_visibility = ref<string>('')
const raf_id = ref<number>(0)
const selection_cb = ref<any>(null)

const menuEl = ref<HTMLElement | null>(null)

const titles_map = computed<any>(() => tableMenuTitles(props.titles))

const props = withDefaults(defineProps<{
  editor: any
  titles?: any
}>(), {
  titles: null,
})

const emit = defineEmits<{
  Run: [any]
  OutsideClick: [any]
}>()

function Run(cmd: any): void {
  let chain = props.editor.chain().focus();
  if (cmd == 'addColumnBefore') {chain.addColumnBefore().run();
  }
  if (cmd == 'addColumnAfter') {chain.addColumnAfter().run();
  }
  if (cmd == 'addRowBefore') {chain.addRowBefore().run();
  }
  if (cmd == 'addRowAfter') {chain.addRowAfter().run();
  }
  if (cmd == 'deleteColumn') {chain.deleteColumn().run();
  }
  if (cmd == 'deleteRow') {chain.deleteRow().run();
  }
  if (cmd == 'deleteTable') {chain.deleteTable().run();
  }

  emit('Run', cmd)
}

function OutsideClick(e: any): void {
  if (visible.value) {let editorEl = props.editor['view'].dom;
  let root = editorEl.closest('.autodown-editor');
  if (root != null) {let menu = root.querySelector('.autodown-table-menu');
  if (menu != null) {if (!menu["contains"](e.target) && !editorEl["contains"](e.target)) {visible.value = false;
  }}}}

  emit('OutsideClick', e)
}

onMounted(() => {






  let schedule = () => { if (raf_id.value != 0) {cancelAnimationFrame(raf_id.value);
  }raf_id.value = requestAnimationFrame(() => { raf_id.value = 0;


  let inside = props.editor.isActive('table');
  visible.value = inside;
  if (inside) {nextTick(() => { 




  let tableEl = props.editor['view'].dom.querySelector('.tableWrapper, table');
  if (tableEl == null) {visible.value = false;
  }if (tableEl != null) {let editorRect = props.editor['view'].dom.getBoundingClientRect();
  let tableRect = tableEl.getBoundingClientRect();
  let trigger = { top: tableRect.top - editorRect.top, left: tableRect.left - editorRect.left, bottom: tableRect.bottom - editorRect.top, right: tableRect.right - editorRect.left, width: tableRect.width, height: tableRect.height };
  let container = { width: editorRect.width, height: editorRect.height };
  let initial = computeMenuPosition(trigger, 0, 0, container, 'top', 8, 'right');
  pos_top.value = initial.top + 'px';
  pos_left.value = initial.left + 'px';
  pos_visibility.value = 'hidden';
  nextTick(() => { 


  if (menuEl.value!) {let menuRect = menuEl.value!.getBoundingClientRect();
  let pos_final = computeMenuPosition(trigger, menuRect.width, menuRect.height, container, 'top', 8, 'right');
  pos_top.value = pos_final.top + 'px';
  pos_left.value = pos_final.left + 'px';
  pos_visibility.value = 'visible';
  } });
  } });
  } });
   };
  selection_cb.value = schedule;
  props.editor.on('selectionUpdate', schedule);
  schedule();
})

onUnmounted(() => {
  
props.editor.off('selectionUpdate', selection_cb.value);

})

function __auto_gl_mousedown_OutsideClick(e: any) {
  OutsideClick(e)
}

onMounted(() => {
  document.addEventListener('mousedown', __auto_gl_mousedown_OutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', __auto_gl_mousedown_OutsideClick)
})


</script>

<template>
    <template v-if="visible">
      <div class="autodown-table-menu" ref="menuEl" :style="({ top: pos_top, left: pos_left, visibility: pos_visibility } as any)">
        <div class="autodown-table-menu-group">
          <button class="autodown-table-menu-btn" :title="titles_map.addRowBefore" @click="Run('addRowBefore')">
            <ArrowUpToLine :size="13" :key="'ArrowUpToLine-1'" />
          </button>
          <button class="autodown-table-menu-btn" :title="titles_map.addRowAfter" @click="Run('addRowAfter')">
            <ArrowDownToLine :size="13" :key="'ArrowDownToLine-2'" />
          </button>
          <button class="autodown-table-menu-btn" :title="titles_map.addColumnBefore" @click="Run('addColumnBefore')">
            <ArrowLeftToLine :size="13" :key="'ArrowLeftToLine-3'" />
          </button>
          <button class="autodown-table-menu-btn" :title="titles_map.addColumnAfter" @click="Run('addColumnAfter')">
            <ArrowRightToLine :size="13" :key="'ArrowRightToLine-4'" />
          </button>
        </div>
        <div class="autodown-table-menu-divider" />
        <div class="autodown-table-menu-group">
          <button class="autodown-table-menu-btn" :title="titles_map.deleteRow" @click="Run('deleteRow')">
            <Trash2 :size="13" :key="'Trash2-5'" />
          </button>
          <button class="autodown-table-menu-btn" :title="titles_map.deleteColumn" @click="Run('deleteColumn')">
            <Eraser :size="13" :key="'Eraser-6'" />
          </button>
          <button class="autodown-table-menu-btn danger" :title="titles_map.deleteTable" @click="Run('deleteTable')">
            <X :size="13" :key="'X-7'" />
          </button>
        </div>
      </div>
    </template>

</template>

<style>
/* Component styles */

</style>
