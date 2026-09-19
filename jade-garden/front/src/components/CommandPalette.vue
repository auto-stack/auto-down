<!-- CommandPalette component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { PaletteIcon } from '../../auto/src/front/utils/command_palette_ext'
import { buildCommands, runCommandAction, listenPaletteHotkeys, unlistenPaletteHotkeys, focusPaletteInput, Clock } from '../../auto/src/front/utils/command_palette_ext'
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
const recent_items = computed<any>(() => recent_file_items(recentFilesStore.files))
const all_items = computed<any>(() => all_palette_items(commands.value, recent_items.value))
const filtered = computed<any>(() => filter_palette(all_items.value, query.value))
const has_results = computed<boolean>(() => filtered.value.length > 0)
const no_results = computed<boolean>(() => filtered.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  Init: []
  Destroy: []
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

function CloseOverlay(): void {
  open.value = false;

  emit('CloseOverlay')
}

function Execute(item: any): void {
  if (item.type == 'command') {runCommandAction(item);
  }
  if (item.type == 'file') {if (item.recent != null) {tabsStore.open(item.recent.path, item.recent.title);
  }}
  open.value = false;

  emit('Execute', item)
}

function ExecuteSelected(): void {
  let item = filtered.value[selected_index.value];
  if (item != null) {if (item.type == 'command') {runCommandAction(item);
  }if (item.type == 'file') {if (item.recent != null) {tabsStore.open(item.recent.path, item.recent.title);
  }}open.value = false;
  }

  emit('ExecuteSelected')
}

function HoverItem(item: any): void {
  selected_index.value = item.idx;

  emit('HoverItem', item)
}

function NextItem(): void {
  selected_index.value = next_index(selected_index.value, filtered.value.length);

  emit('NextItem')
}

function PrevItem(): void {
  selected_index.value = prev_index(selected_index.value, filtered.value.length);

  emit('PrevItem')
}

function QueryInput(e: any): void {
  query.value = e.target.value;

  emit('QueryInput', e)
}

function recent_file_items(files: any): any {
  let out: any[] = [];
  for (const f of files) {out.push({ id: `recent:${f.path}`, type: 'file', title: f.title, subtitle: f.path, recent: f });
  }
  return out;
}

function all_palette_items(cmds: any, recents: any): any {
  let out: any[] = [];
  for (const c of cmds) {out.push(c);
  }
  for (const r of recents) {out.push(r);
  }
  return out;
}

function filter_palette(items: any, qstr: any): any {
  let rows: any[] = [];
  let needle = qstr.trim().toLowerCase();
  let kept: number = 0;
  for (const it of items) {if (kept >= 20) {break;
  }let sub_text: string = '';
  if (it.subtitle != null) {sub_text = it.subtitle;
  }if (needle == '') {rows.push({ id: it.id, type: it.type, title: it.title, subtitle: sub_text, icon: it.icon, action: it.action, recent: it.recent, idx: kept, has_subtitle: it.subtitle != null });
  kept = kept + 1;
  }if (needle != '') {let hay_title = it.title.toLowerCase();
  let hay_sub = sub_text.toLowerCase();
  if (hay_title.includes(needle) || hay_sub.includes(needle)) {rows.push({ id: it.id, type: it.type, title: it.title, subtitle: sub_text, icon: it.icon, action: it.action, recent: it.recent, idx: kept, has_subtitle: it.subtitle != null });
  kept = kept + 1;
  }}}
  return rows;
}

function next_index(i: any, len: any): number {
  return (i + 1) %len;
}

function prev_index(i: any, len: any): number {
  return (i - 1 + len) %len;
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
              <input class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" :placeholder="'Type a command or recent file...'" :type="'text'" v-model="query" @input="QueryInput(($event.target as HTMLInputElement).value)" @keydown.down.prevent="NextItem" @keydown.enter.prevent="ExecuteSelected" @keydown.up.prevent="PrevItem" />
            </div>
            <template v-if="has_results">
              <component :is="(ul_tag) as any" class="max-h-[50vh] overflow-y-auto py-1">
                <component :is="(li_tag) as any" :class="(item.idx == selected_index ? 'cursor-pointer px-3 py-2 text-sm bg-accent text-accent-foreground' : 'cursor-pointer px-3 py-2 text-sm text-foreground hover:bg-accent/50')" :key="item.idx" @click="Execute(item)" @mouseenter="HoverItem(item)" v-for="item in filtered">
                  <div class="flex items-center gap-2">
                    <template v-if="item.type == 'command'">
                      <PaletteIcon :class="'h-4 w-4 shrink-0 opacity-70'" :icon="item.icon" :key="'PaletteIcon-1-' + (((item as any)?.id ?? item))" />
                    </template>
                    <template v-if="item.type == 'file'">
                      <PaletteIcon :class="'h-4 w-4 shrink-0 opacity-70'" :icon="Clock" :key="'PaletteIcon-2-' + (((item as any)?.id ?? item))" />
                    </template>
                    <div class="min-w-0 flex-1">
                      <div class="truncate">
                        <span>{{ item.title }}</span>
                      </div>
                      <template v-if="item.has_subtitle">
                        <div :class="(item.idx == selected_index ? 'truncate text-[11px] text-accent-foreground/70' : 'truncate text-[11px] text-muted-foreground')">
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
