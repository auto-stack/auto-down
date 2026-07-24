<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { readWhiteboard, writeWhiteboard, type WhiteboardShape } from '@/lib/api'
import { useTabsStore } from '@/stores/tabs'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const doc = ref<{ shapes: WhiteboardShape[] }>({ shapes: [] })
const loading = ref(false)
const error = ref<string | null>(null)
const selectedId = ref<string | null>(null)

const shapes = computed(() => doc.value.shapes)

async function load() {
  loading.value = true
  error.value = null
  try {
    doc.value = await readWhiteboard(props.path)
  } catch (e: any) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function addShape() {
  const id = `shape-${Date.now()}`
  const x = 50 + (doc.value.shapes.length % 5) * 160
  const y = 50 + Math.floor(doc.value.shapes.length / 5) * 120
  doc.value.shapes.push({
    id,
    kind: 'note',
    x,
    y,
    width: 140,
    height: 100,
    label: 'New note',
  })
  save()
}

function updateLabel(shape: WhiteboardShape, event: Event) {
  const target = event.target as HTMLDivElement
  shape.label = target.innerText
  save()
}

async function save() {
  try {
    await writeWhiteboard(props.path, doc.value)
    const tab = tabs.tabs.find(t => t.path === props.path)
    if (tab) tab.dirty = false
  } catch (e) {
    console.error('Failed to save whiteboard', e)
  }
}

function openTarget(shape: WhiteboardShape) {
  if (!shape.target) return
  const targetPath = shape.target.endsWith('.ad') ? shape.target : `${shape.target}.ad`
  tabs.open(targetPath)
}
</script>

<template>
  <div class="flex h-full flex-col bg-background">
    <div class="flex h-[var(--header-height)] items-center justify-between border-b px-3">
      <span class="text-sm font-medium">{{ path }}</span>
      <button
        type="button"
        class="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        @click="addShape"
      >
        Add note
      </button>
    </div>
    <div class="relative flex-1 overflow-hidden">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
      <div v-else-if="error" class="absolute inset-0 flex items-center justify-center text-sm text-destructive">
        {{ error }}
      </div>
      <div
        v-else
        class="absolute inset-0"
        @click="selectedId = null"
      >
        <div
          v-for="shape in shapes"
          :key="shape.id"
          class="absolute rounded-md border bg-card p-2 shadow-sm"
          :class="{ 'ring-2 ring-primary': selectedId === shape.id }"
          :style="{ left: `${shape.x}px`, top: `${shape.y}px`, width: `${shape.width}px`, height: `${shape.height}px` }"
          @click.stop="selectedId = shape.id"
          @dblclick="openTarget(shape)"
        >
          <div
            class="h-full w-full overflow-hidden text-xs outline-none"
            contenteditable
            @blur="updateLabel(shape, $event)"
          >
            {{ shape.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
