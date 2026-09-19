<!-- QuickSwitcher component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { listenSwitcherHotkeys, unlistenSwitcherHotkeys, focusSwitcherInput, Search } from '../../auto/src/front/utils/quick_switcher_ext'
import { useFileTreeStore, useTabsStore } from '../../auto/src/front/utils/quick_switcher_ext'

const fileTreeStore = useFileTreeStore()
const tabsStore = useTabsStore()


const open = ref<boolean>(false)
const query = ref<string>('')
const selected_index = ref<number>(0)

const all_files = computed<any>(() => collect_files(fileTreeStore.files, []))
const filtered = computed<any>(() => filter_files(all_files.value, query.value))
const has_results = computed<boolean>(() => filtered.value.length > 0)
const no_results = computed<boolean>(() => filtered.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  Init: []
  Destroy: []
  CloseOverlay: []
  QueryInput: [any]
  SelectFile: [any]
  SelectCurrent: []
  NextItem: []
  PrevItem: []
  HoverFile: [any]
}>()

watch(open, () => {
  if (open.value) {query.value = '';
  selected_index.value = 0;
  focusSwitcherInput();
  }
})

watch(filtered, () => {
  selected_index.value = 0;
})

function CloseOverlay(): void {
  open.value = false;

  emit('CloseOverlay')
}

function HoverFile(file: any): void {
  selected_index.value = file.idx;

  emit('HoverFile', file)
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

function SelectCurrent(): void {
  let file = filtered.value[selected_index.value];
  if (file != null) {tabsStore.open(file.path);
  open.value = false;
  }

  emit('SelectCurrent')
}

function SelectFile(file: any): void {
  tabsStore.open(file.path);
  open.value = false;

  emit('SelectFile', file)
}

function collect_files(nodes: any, out: any): any {
  for (const nd of nodes) {if (nd.is_dir) {if (nd.children != null) {collect_files(nd.children, out);
  }}if (!nd.is_dir) {out.push({ path: nd.path, name: nd.name });
  }}
  return out;
}

function filter_files(files: any, qstr: any): any {
  let rows: any[] = [];
  let needle = qstr.trim().toLowerCase();
  let kept: number = 0;
  for (const f of files) {if (kept >= 12) {break;
  }if (needle == '') {rows.push({ path: f.path, name: f.name, idx: kept });
  kept = kept + 1;
  }if (needle != '') {let hay_name = f.name.toLowerCase();
  let hay_path = f.path.toLowerCase();
  if (hay_name.includes(needle) || hay_path.includes(needle)) {rows.push({ path: f.path, name: f.name, idx: kept });
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
  let open_cb = () => { open.value = true;
   };
  let close_cb = () => { open.value = false;
   };
  listenSwitcherHotkeys(open_cb, close_cb);
})

onUnmounted(() => {
  unlistenSwitcherHotkeys();

})


</script>

<template>
    <div>
      <template v-if="open">
        <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[20vh]" @click.self="CloseOverlay">
          <div class="w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-lg">
            <div class="flex items-center gap-2 border-b px-3 py-2">
              <component :is="(Search) as any" class="h-4 w-4 text-muted-foreground" />
              <input class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" :placeholder="'Search files...'" :type="'text'" v-model="query" @input="QueryInput(($event.target as HTMLInputElement).value)" @keydown.down.prevent="NextItem" @keydown.enter.prevent="SelectCurrent" @keydown.up.prevent="PrevItem" />
              <span class="text-xs text-muted-foreground">
                <span>Ctrl+O</span>
              </span>
            </div>
            <template v-if="has_results">
              <component :is="(ul_tag) as any" class="max-h-[50vh] overflow-y-auto py-1">
                <component :is="(li_tag) as any" :class="(file.idx == selected_index ? 'cursor-pointer px-3 py-1.5 text-sm bg-accent text-accent-foreground' : 'cursor-pointer px-3 py-1.5 text-sm text-foreground hover:bg-accent/50')" :key="file.idx" @click="SelectFile(file)" @mouseenter="HoverFile(file)" v-for="file in filtered">
                  <span>{{ file.name }}</span>
                  <span class="ml-2 text-xs text-muted-foreground">
                    <span>{{ file.path }}</span>
                  </span>
                </component>
              </component>
            </template>
            <template v-if="no_results">
              <p class="px-3 py-4 text-center text-sm text-muted-foreground">
                <span>No files found</span>
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
