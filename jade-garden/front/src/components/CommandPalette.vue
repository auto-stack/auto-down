<!-- CommandPalette component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { PaletteIcon } from '../../auto/src/front/utils/command_palette_ext'
import { buildCommands, recentFileItems, allPaletteItems, filterPalette, runPaletteItem, nextIndex, prevIndex, listenPaletteHotkeys, unlistenPaletteHotkeys, focusPaletteInput } from '../../auto/src/front/utils/command_palette_ext'
import { useTabsStore, useFileTreeStore, useSidebarStore, useThemeStore, useRecentFilesStore, useWorkspaceStore } from '../../auto/src/front/utils/command_palette_ext'

const tabsStore = useTabsStore()
const fileTreeStore = useFileTreeStore()
const sidebarStore = useSidebarStore()
const themeStore = useThemeStore()
const recentFilesStore = useRecentFilesStore()
const workspaceStore = useWorkspaceStore()


const open = ref<boolean>(false)
const query = ref<string>('')
const selected_index = ref<number>(0)

const commands = computed<any>(() => buildCommands(tabsStore, fileTreeStore, sidebarStore, themeStore))
const recent_items = computed<any>(() => recentFileItems(recentFilesStore.files))
const all_items = computed<any>(() => allPaletteItems(commands.value, recent_items.value))
const filtered = computed<any>(() => filterPalette(all_items.value, query.value))
const has_results = computed<boolean>(() => filtered.value.length > 0)
const no_results = computed<boolean>(() => filtered.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  CloseOverlay: []
  QueryInput: [any]
  Execute: [any]
  ExecuteSelected: []
  NextItem: []
  PrevItem: []
  HoverItem: [any]
}>()

watch(open, () => {
  if (open.value) {query.value = '';
  selected_index.value = 0;
  focusPaletteInput();
  }
})

watch(filtered, () => {
  selected_index.value = 0;
})

function NextItem(): void {
  selected_index.value = nextIndex(selected_index.value, filtered.value.length);

  emit('NextItem')
}

function CloseOverlay(): void {
  open.value = false;

  emit('CloseOverlay')
}

function HoverItem(item: any): void {
  selected_index.value = item.idx;

  emit('HoverItem', item)
}

function ExecuteSelected(): void {
  let item = filtered.value[selected_index.value];
  if (item != null) {runPaletteItem(item, tabsStore);
  open.value = false;
  }

  emit('ExecuteSelected')
}

function QueryInput(e: any): void {
  query.value = e.target.value;

  emit('QueryInput', e)
}

function PrevItem(): void {
  selected_index.value = prevIndex(selected_index.value, filtered.value.length);

  emit('PrevItem')
}

function Execute(item: any): void {
  runPaletteItem(item, tabsStore);
  open.value = false;

  emit('Execute', item)
}

onMounted(() => {
  let toggle = () => { open.value = !open.value;
   };
  let on_escape = () => { open.value = false;
   };
  listenPaletteHotkeys(workspaceStore, toggle, on_escape);
})

onUnmounted(() => {
  unlistenPaletteHotkeys();

})


</script>

<template>
    <div>
      <template v-if="open">
        <div class="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[20vh]" @click.self="CloseOverlay">
          <div class="w-full max-w-xl overflow-hidden rounded-lg border bg-card shadow-lg">
            <div class="flex items-center gap-2 border-b px-3 py-2">
              <span class="text-xs text-muted-foreground">
                <span>⌘/Ctrl+P</span>
              </span>
              <input class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" :type="'text'" :placeholder="'Type a command or recent file...'" v-model="query" @keydown.down.prevent="NextItem" @keydown.up.prevent="PrevItem" @keydown.enter.prevent="ExecuteSelected" />
            </div>
            <template v-if="has_results">
              <component :is="(ul_tag) as any" class="max-h-[50vh] overflow-y-auto py-1">
                <component :is="(li_tag) as any" class="cursor-pointer px-3 py-2 text-sm" :class="item.idx == selected_index ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'" @mouseenter="HoverItem(item)" @click="Execute(item)" v-for="item in filtered">
                  <div class="flex items-center gap-2">
                    <PaletteIcon :class="'h-4 w-4 shrink-0 opacity-70'" :icon="item.icon" :key="'PaletteIcon-1-' + (item?.id ?? item)" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate">
                        <span>{{ item.title }}</span>
                      </div>
                      <template v-if="item.has_subtitle">
                        <div class="truncate text-[11px]" :class="item.idx == selected_index ? 'text-accent-foreground/70' : 'text-muted-foreground'">
                          <span>{{ item.subtitle }}</span>
                        </div>
                      </template>
                    </div>
                  </div>
                </component>
              </component>
            </template>
            <template v-if="no_results">
              <p class="px-3 py-4 text-center text-sm text-muted-foreground">
                <span>No commands found</span>
              </p>
            </template>
          </div>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
