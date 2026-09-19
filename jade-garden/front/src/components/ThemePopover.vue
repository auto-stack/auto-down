<!-- ThemePopover component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { Sun, Moon, isOutsideThemePopover } from '../../auto/src/front/utils/theme_popover_ext'
import { useThemeStore } from '../../auto/src/front/utils/theme_popover_ext'

const themeStore = useThemeStore()


const props = defineProps<{
  open: boolean
}>()

const is_open = computed<boolean>(() => props.open)
const accents = computed<any>(() => theme_accents())

const emit = defineEmits<{
  Close: [any]
  SetLight: []
  SetDark: []
  SetAccent: [any]
}>()

function Close(e: any): void {
  let outside = isOutsideThemePopover(e);

  emit('Close', e)
}

function SetAccent(accent: any): void {
  themeStore.setAccent(accent.key);

  emit('SetAccent', accent)
}

function SetDark(): void {
  themeStore.setMode('dark');

  emit('SetDark')
}

function SetLight(): void {
  themeStore.setMode('light');

  emit('SetLight')
}

function theme_accents(): any {
  return [{ key: 'indigo', label: 'Indigo', color: 'hsl(238 55% 58%)' }, { key: 'emerald', label: 'Emerald', color: 'hsl(160 60% 38%)' }, { key: 'rose', label: 'Rose', color: 'hsl(350 70% 55%)' }, { key: 'amber', label: 'Amber', color: 'hsl(38 90% 50%)' }, { key: 'slate', label: 'Slate', color: 'hsl(220 10% 45%)' }];
}


</script>

<template>
    <Teleport to="body">
      <template v-if="is_open">
        <div class="fixed inset-0 z-40" @click="Close" />
      </template>
      <template v-if="is_open">
        <div class="theme-popover fixed left-[52px] bottom-3 z-50 w-56 rounded-xl border bg-card p-3 shadow-lg">
          <div class="mb-3">
            <span class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Appearance</span>
            </span>
            <div class="flex rounded-lg border p-0.5">
              <button :class="(themeStore.mode == 'light' ? 'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors bg-primary/10 text-primary' : 'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors text-muted-foreground hover:bg-accent')" :type="'button'" @click="SetLight">
                <component :is="(Sun) as any" class="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
              <button :class="(themeStore.mode == 'dark' ? 'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors bg-primary/10 text-primary' : 'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors text-muted-foreground hover:bg-accent')" :type="'button'" @click="SetDark">
                <component :is="(Moon) as any" class="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>
          <div>
            <span class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Accent</span>
            </span>
            <div class="grid grid-cols-5 gap-1.5">
              <button :class="(themeStore.accent == accent.key ? 'flex h-7 items-center justify-center rounded-md border transition-all border-primary ring-1 ring-primary' : 'flex h-7 items-center justify-center rounded-md border transition-all border-border hover:border-muted-foreground')" :key="accent.key" :title="accent.label" :type="'button'" @click="SetAccent(accent)" v-for="accent in accents">
                <span class="h-4 w-4 rounded-full" :style="({ backgroundColor: accent.color } as any)" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </Teleport>

</template>

<style>
/* Component styles */

</style>
