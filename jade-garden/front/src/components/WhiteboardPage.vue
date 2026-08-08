<!-- WhiteboardPage component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { loadWhiteboard, saveWhiteboard, addNoteShape, shapeList, readLabel, openShapeTarget, showError, showCanvas } from '../../auto/src/front/utils/whiteboard_page_ext'
import { useTabsStore } from '../../auto/src/front/utils/whiteboard_page_ext'

const tabsStore = useTabsStore()


const doc = ref<any>({})
const loading = ref<boolean>(false)
const error = ref<any>(null)
const selected_id = ref<any>(null)

const shape_list = computed<any>(() => shapeList(doc.value, selected_id.value))
const show_error = computed<any>(() => showError(loading.value, error.value))
const show_canvas = computed<any>(() => showCanvas(loading.value, error.value))

const props = defineProps<{
  path: string
}>()

const emit = defineEmits<{
  AddShape: []
  UpdateLabel: [any]
  OpenTarget: [any]
  Select: [any]
  Deselect: []
}>()

function Select(sid: any): void {
  selected_id.value = sid;

  emit('Select', sid)
}

function OpenTarget(shape: any): void {
  openShapeTarget(tabsStore, shape);

  emit('OpenTarget', shape)
}

function UpdateLabel(args: any): void {
  args.shape.label = readLabel(args.evt);
  saveWhiteboard(tabsStore, props.path, doc.value);

  emit('UpdateLabel', args)
}

function Deselect(): void {
  selected_id.value = null;

  emit('Deselect')
}

function AddShape(): void {
  addNoteShape(doc.value);
  saveWhiteboard(tabsStore, props.path, doc.value);

  emit('AddShape')
}

onMounted(() => {
  loading.value = true;
  error.value = null;
  loadWhiteboard(props.path, (d: any) => { doc.value = d;
   }, (e: any) => { error.value = e;
   }, () => { loading.value = false;
   });
})


</script>

<template>
    <div class="flex h-full flex-col bg-background">
      <div class="flex h-[var(--header-height)] items-center justify-between border-b px-3">
        <span class="text-sm font-medium">
          <span>{{ path }}</span>
        </span>
        <button class="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90" :type="'button'" @click="AddShape">
          <span>Add note</span>
        </button>
      </div>
      <div class="relative flex-1 overflow-hidden">
        <template v-if="loading">
          <div class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            <span>Loading…</span>
          </div>
        </template>
        <template v-if="show_error">
          <div class="absolute inset-0 flex items-center justify-center text-sm text-destructive">
            <span>{{ error }}</span>
          </div>
        </template>
        <template v-if="show_canvas">
          <div class="absolute inset-0" @click="Deselect">
            <div class="absolute rounded-md border bg-card p-2 shadow-sm" :class="{ 'ring-2 ring-primary': item.selected }" :key="item.sid" :style="({ left: item.s_left, top: item.s_top, width: item.s_width, height: item.s_height } as any)" @dblclick="OpenTarget(item.shape)" @click.stop="Select(item.sid)" v-for="item in shape_list">
              <div class="h-full w-full overflow-hidden text-xs outline-none" :contenteditable="'true'" @blur="UpdateLabel({ shape: item.shape, evt: $event })">
                <span>{{ item.shape.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
