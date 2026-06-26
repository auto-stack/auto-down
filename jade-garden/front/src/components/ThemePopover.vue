<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useThemeStore, type ThemeAccent, type ThemeMode } from '@/stores/theme'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const theme = useThemeStore()

const accents: { key: ThemeAccent; label: string; color: string }[] = [
  { key: 'indigo', label: 'Indigo', color: 'hsl(238 55% 58%)' },
  { key: 'emerald', label: 'Emerald', color: 'hsl(160 60% 38%)' },
  { key: 'rose', label: 'Rose', color: 'hsl(350 70% 55%)' },
  { key: 'amber', label: 'Amber', color: 'hsl(38 90% 50%)' },
  { key: 'slate', label: 'Slate', color: 'hsl(220 10% 45%)' },
]

function setMode(mode: ThemeMode) {
  theme.setMode(mode)
}

function setAccent(accent: ThemeAccent) {
  theme.setAccent(accent)
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.theme-popover')) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @click="onClickOutside"
    />
    <div
      v-if="open"
      class="theme-popover fixed left-[52px] bottom-3 z-50 w-56 rounded-xl border bg-card p-3 shadow-lg"
    >
      <div class="mb-3">
        <span class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</span>
        <div class="flex rounded-lg border p-0.5">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors"
            :class="theme.mode === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'"
            @click="setMode('light')"
          >
            <Sun class="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors"
            :class="theme.mode === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'"
            @click="setMode('dark')"
          >
            <Moon class="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
      </div>

      <div>
        <span class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Accent</span>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="accent in accents"
            :key="accent.key"
            type="button"
            :title="accent.label"
            class="flex h-7 items-center justify-center rounded-md border transition-all"
            :class="theme.accent === accent.key ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground'"
            @click="setAccent(accent.key)"
          >
            <span
              class="h-4 w-4 rounded-full"
              :style="{ backgroundColor: accent.color }"
            />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
