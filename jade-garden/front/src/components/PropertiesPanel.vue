<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Trash2, Check, X } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import { useDebounceFn } from '@vueuse/core'

type PropValue = string | number | boolean | string[] | null

const tabs = useTabsStore()

interface PropEntry {
  key: string
  value: PropValue
  type: 'text' | 'number' | 'boolean' | 'date' | 'list'
}

const entries = ref<PropEntry[]>([])
const newKey = ref('')
const newValue = ref('')

function inferType(value: PropValue): PropEntry['type'] {
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    if (value === 'true' || value === 'false') return 'boolean'
  }
  return 'text'
}

function normalize(value: string | number | boolean | string[] | null | undefined): PropValue {
  if (value === undefined) return ''
  if (value === null) return null
  return value
}

function syncEntries() {
  const fm = tabs.activeTab?.frontmatter ?? {}
  entries.value = Object.entries(fm).map(([key, raw]) => {
    const value = normalize(raw)
    return { key, value, type: inferType(value) }
  })
}

watch(() => tabs.activeTab?.path, syncEntries, { immediate: true })
watch(() => tabs.activeTab?.frontmatter, syncEntries, { deep: true })

const dirty = computed(() => {
  const fm = tabs.activeTab?.frontmatter ?? {}
  if (entries.value.length !== Object.keys(fm).length) return true
  for (const e of entries.value) {
    const current = normalize(fm[e.key])
    if (JSON.stringify(current) !== JSON.stringify(e.value)) return true
  }
  return false
})

const debouncedSave = useDebounceFn(() => {
  if (tabs.activeTab?.path) tabs.save(tabs.activeTab.path)
}, 1200)

function updateFrontmatter() {
  if (!tabs.activeTab) return
  const fm: Record<string, any> = {}
  for (const e of entries.value) {
    if (!e.key.trim()) continue
    if (e.value === null) continue
    if (e.type === 'number' && typeof e.value === 'string') {
      const n = Number(e.value)
      fm[e.key] = Number.isNaN(n) ? e.value : n
    } else if (e.type === 'boolean' && typeof e.value === 'string') {
      fm[e.key] = e.value === 'true'
    } else if (e.type === 'list' && typeof e.value === 'string') {
      fm[e.key] = e.value.split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      fm[e.key] = e.value
    }
  }
  tabs.activeTab.frontmatter = fm
  debouncedSave()
}

function setType(idx: number, type: PropEntry['type']) {
  const e = entries.value[idx]
  e.type = type
  if (type === 'boolean') {
    e.value = Boolean(e.value)
  } else if (type === 'list') {
    e.value = Array.isArray(e.value) ? e.value : String(e.value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  } else if (type === 'number') {
    e.value = String(e.value ?? '')
  } else {
    e.value = String(e.value ?? '')
  }
  updateFrontmatter()
}

function addProperty() {
  const key = newKey.value.trim()
  if (!key) return
  if (entries.value.some((e) => e.key === key)) {
    alert(`Property "${key}" already exists.`)
    return
  }
  entries.value.push({ key, value: newValue.value, type: 'text' })
  newKey.value = ''
  newValue.value = ''
  updateFrontmatter()
}

function removeProperty(idx: number) {
  entries.value.splice(idx, 1)
  updateFrontmatter()
}

function cancel() {
  syncEntries()
}
</script>

<template>
  <div class="rounded-lg border bg-background/50 p-2.5">
    <div class="mb-2 flex items-center justify-between">
      <h4 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</h4>
      <div v-if="dirty" class="flex items-center gap-1">
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Revert"
          @click="cancel"
        >
          <X class="h-3 w-3" />
        </button>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-primary hover:bg-primary/10"
          title="Save now"
          @click="tabs.activeTab?.path && tabs.save(tabs.activeTab.path)"
        >
          <Check class="h-3 w-3" />
        </button>
      </div>
    </div>

    <div v-if="entries.length" class="space-y-2">
      <div v-for="(entry, idx) in entries" :key="entry.key" class="group">
        <div class="mb-0.5 flex items-center justify-between">
          <input
            v-model="entry.key"
            type="text"
            class="w-full bg-transparent text-[11px] font-medium text-muted-foreground outline-none"
            @change="updateFrontmatter"
          >
          <button
            type="button"
            class="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible"
            @click="removeProperty(idx)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </div>

        <div class="flex items-center gap-1">
          <template v-if="entry.type === 'boolean'">
            <button
              type="button"
              class="h-6 rounded border px-2 text-xs transition-colors"
              :class="entry.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'"
              @click="entry.value = !entry.value; updateFrontmatter()"
            >
              {{ entry.value ? 'true' : 'false' }}
            </button>
          </template>
          <template v-else-if="entry.type === 'date'">
            <input
              v-model="entry.value"
              type="date"
              class="h-6 w-full rounded border bg-background px-1.5 text-xs outline-none focus:border-primary"
              @input="updateFrontmatter"
            >
          </template>
          <template v-else>
            <input
              v-model="entry.value"
              type="text"
              class="h-6 w-full rounded border bg-background px-1.5 text-xs outline-none focus:border-primary"
              :placeholder="entry.type === 'list' ? 'comma, separated, values' : 'value'"
              @input="updateFrontmatter"
            >
          </template>

          <select
            :value="entry.type"
            class="h-6 rounded border bg-background px-1 text-[10px] uppercase text-muted-foreground outline-none"
            @change="setType(idx, ($event.target as HTMLSelectElement).value as any)"
          >
            <option value="text">text</option>
            <option value="number">num</option>
            <option value="boolean">bool</option>
            <option value="date">date</option>
            <option value="list">list</option>
          </select>
        </div>
      </div>
    </div>
    <p v-else class="text-xs text-muted-foreground">No frontmatter properties.</p>

    <div class="mt-3 flex items-center gap-1 border-t border-border/50 pt-2">
      <input
        v-model="newKey"
        type="text"
        placeholder="key"
        class="h-6 flex-1 rounded border bg-background px-1.5 text-xs outline-none focus:border-primary"
        @keydown.enter="addProperty"
      >
      <input
        v-model="newValue"
        type="text"
        placeholder="value"
        class="h-6 flex-1 rounded border bg-background px-1.5 text-xs outline-none focus:border-primary"
        @keydown.enter="addProperty"
      >
      <button
        type="button"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        @click="addProperty"
      >
        <Plus class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
