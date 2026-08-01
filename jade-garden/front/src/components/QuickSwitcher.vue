<!-- QuickSwitcher component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { collectFiles, filterFiles, nextIndex, prevIndex, listenSwitcherHotkeys, unlistenSwitcherHotkeys, focusSwitcherInput, Search } from '../../auto/src/front/utils/quick_switcher_ext'
import { useFileTreeStore, useTabsStore } from '../../auto/src/front/utils/quick_switcher_ext'

const fileTreeStore = useFileTreeStore()
const tabsStore = useTabsStore()


const open = ref<boolean>(false)
const query = ref<string>('')
const selected_index = ref<number>(0)

const all_files = computed<any>(() => collectFiles(fileTreeStore.files))
const filtered = computed<any>(() => filterFiles(all_files.value, query.value))
const has_results = computed<boolean>(() => filtered.value.length > 0)
const no_results = computed<boolean>(() => filtered.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
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

function SelectFile(file: any): void {
  tabsStore.open(file.path);
  open.value = false;

  emit('SelectFile', file)
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

function PrevItem(): void {
  selected_index.value = prevIndex(selected_index.value, filtered.value.length);

  emit('PrevItem')
}

function NextItem(): void {
  selected_index.value = nextIndex(selected_index.value, filtered.value.length);

  emit('NextItem')
}

function HoverFile(file: any): void {
  selected_index.value = file.idx;

  emit('HoverFile', file)
}

function CloseOverlay(): void {
  open.value = false;

  emit('CloseOverlay')
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
              <input class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" :type="'text'" :placeholder="'Search files...'" v-model="query" @keydown.up.prevent="PrevItem" @keydown.enter.prevent="SelectCurrent" @keydown.down.prevent="NextItem" />
              <span class="text-xs text-muted-foreground">
                <span>Ctrl+O</span>
              </span>
            </div>
            <template v-if="has_results">
              <component :is="(ul_tag) as any" class="max-h-[50vh] overflow-y-auto py-1">
                <component :is="(li_tag) as any" class="cursor-pointer px-3 py-1.5 text-sm" :class="file.idx == selected_index ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'" @click="SelectFile(file)" @mouseenter="HoverFile(file)" v-for="file in filtered">
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
