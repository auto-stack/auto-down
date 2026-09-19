<!-- SearchPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDebounceFn, snippetHtml, scheduleScrollToBlock, errorMessage, Search, FileText, Box } from '../../auto/src/front/utils/search_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/search_panel_ext'

const tabsStore = useTabsStore()

import { search_pages } from '../../auto/src/front/utils/search_panel_ext'

const query = ref<string>('')
const results = ref<any[]>([])
const loading = ref<boolean>(false)
const error = ref<string>('')
const debounced_search = ref<any>(null)

const display_results = computed<any>(() => with_search_display(results.value))
const has_query = computed<boolean>(() => query.value.trim()?.length > 0)
const has_error = computed<boolean>(() => !!(error.value))
const show_loading = computed<boolean>(() => loading.value)
const show_error = computed<boolean>(() => !loading.value && has_error.value)
const show_results = computed<boolean>(() => !loading.value && !has_error.value && results.value.length > 0)
const show_no_results = computed<boolean>(() => !loading.value && !has_error.value && results.value.length === 0 && has_query.value)
const show_hint = computed<boolean>(() => !loading.value && !has_error.value && results.value.length === 0 && !has_query.value)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  Init: []
  QueryInput: [any]
  OpenResult: [any]
}>()

watch(query, () => {
  let f = debounced_search.value;
  f();
})

function OpenResult(r: any): void {
  if (r.type == 'Page' && r.path != null) {tabsStore.open(r.path, r.title);
  }
  if (r.type == 'Block' && r.page_path != null) {let p = tabsStore.open(r.page_path);
  p.then(() => { if (r.block_id != null) {scheduleScrollToBlock(r.page_path, r.block_id);
  } });
  }

  emit('OpenResult', r)
}

function QueryInput(e: any): void {
  query.value = e.target.value;

  emit('QueryInput', e)
}

function with_search_display(rows_in: any): any {
  let out: any[] = [];
  for (const r of rows_in) {let tt: string = '';
  if (r.type == 'Page') {if (r.title != null) {tt = r.title;
  }}if (r.type != 'Page') {if (r.page_path != null) {tt = r.page_path;
  }}let sn_html: string = '';
  let sn_has: boolean = false;
  if (r.snippet != null) {sn_html = snippetHtml(r.snippet);
  sn_has = true;
  }out.push({ type: r.type, path: r.path, title: r.title, uuid: r.uuid, page_path: r.page_path, block_id: r.block_id, content: r.content, snippet: r.snippet, is_page: r.type == 'Page', is_block: r.type != 'Page', title_text: tt, has_snippet: sn_has, snippet_html: sn_html });
  }
  return out;
}

onMounted(async () => {
  let run = async () => { let q = query.value.trim();
  if (q != '') {loading.value = true;
  error.value = '';
  try {let res = await search_pages(q, 30);
  results.value = res.results;
  error.value = '';
  } catch (e) {results.value = [];
  error.value = errorMessage(e);
  } finally {loading.value = false;
  }
  }if (q == '') {results.value = [];
  } };
  let f = useDebounceFn(run, 250);
  debounced_search.value = f;
})


</script>

<template>
    <div class="flex h-full flex-col p-3">
      <div class="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
        <component :is="(Search) as any" class="h-4 w-4 text-muted-foreground" />
        <input class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" :placeholder="'Search pages and blocks...'" :type="'text'" v-model="query" @input="QueryInput(($event.target as HTMLInputElement).value)" />
      </div>
      <template v-if="show_loading">
        <div class="mt-4 text-center text-xs text-muted-foreground">
          <span>Searching…</span>
        </div>
      </template>
      <template v-if="show_error">
        <div class="mt-4 text-center text-xs text-destructive">
          <span>{{ error }}</span>
        </div>
      </template>
      <template v-if="show_results">
        <component :is="(ul_tag) as any" class="mt-2 flex-1 space-y-1 overflow-y-auto">
          <component :is="(li_tag) as any" class="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent" :key="r.page_path" @click="OpenResult(r)" v-for="r in display_results">
            <div class="flex items-center gap-1.5">
              <template v-if="r.is_page">
                <component :is="(FileText) as any" class="h-3.5 w-3.5 text-muted-foreground" />
              </template>
              <template v-if="r.is_block">
                <component :is="(Box) as any" class="h-3.5 w-3.5 text-muted-foreground" />
              </template>
              <span class="truncate font-medium">
                <span>{{ r.title_text }}</span>
              </span>
            </div>
            <template v-if="r.has_snippet">
              <div class="mt-0.5 pl-5 text-xs text-muted-foreground" v-html="r.snippet_html" />
            </template>
          </component>
        </component>
      </template>
      <template v-if="show_no_results">
        <p class="mt-4 text-center text-xs text-muted-foreground">
          <span>No results</span>
        </p>
      </template>
      <template v-if="show_hint">
        <p class="mt-4 text-center text-xs text-muted-foreground">
          <span>Type to search pages and blocks</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
