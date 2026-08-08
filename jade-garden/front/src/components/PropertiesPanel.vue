<!-- PropertiesPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDebounceFn, syncEntries, fmJson, propsDirty, commitFrontmatter, setEntryType, tryAddProperty, withPropDisplay, eventValue, tabsActiveTab, Plus, Trash2, Check, X } from '../../auto/src/front/utils/properties_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/properties_panel_ext'

const tabsStore = useTabsStore()


const entries = ref<any[]>([])
const new_key = ref<string>('')
const new_value = ref<string>('')
const debounced_save = ref<any>(null)

const active_tab = computed<any>(() => tabsActiveTab(tabsStore))
const fm_json = computed<any>(() => fmJson(tabsStore))
const display_entries = computed<any>(() => withPropDisplay(entries.value))
const is_dirty = computed<any>(() => propsDirty(entries.value, tabsStore))
const has_entries = computed<boolean>(() => entries.value.length > 0)
const no_entries = computed<boolean>(() => entries.value.length === 0)
const select_tag = computed<string>(() => 'select')
const option_tag = computed<string>(() => 'option')

const emit = defineEmits<{
  KeyChanged: [any]
  ValueChanged: [any]
  Commit: []
  ToggleBool: [any]
  SetType: [any]
  RemoveProperty: [any]
  AddProperty: []
  Cancel: []
  SaveNow: []
  NewKeyInput: [any]
  NewValueInput: [any]
}>()

watch(active_tab, () => {
  entries.value = syncEntries(tabsStore);
}, { immediate: true })

watch(fm_json, () => {
  entries.value = syncEntries(tabsStore);
})

function NewKeyInput(e: any): void {
  new_key.value = e.target.value;

  emit('NewKeyInput', e)
}

function ValueChanged(args: any): void {
  args.entry.value = eventValue(args.evt);
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);

  emit('ValueChanged', args)
}

function KeyChanged(args: any): void {
  args.entry.key = eventValue(args.evt);

  emit('KeyChanged', args)
}

function Commit(entry: any): void {
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);

  emit('Commit')
}

function SetType(args: any): void {
  setEntryType(entries.value, args.idx, eventValue(args.evt));
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);

  emit('SetType', args)
}

function AddProperty(): void {
  let added = tryAddProperty(entries.value, new_key.value, new_value.value);
  if (added) {new_key.value = '';
  new_value.value = '';
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);
  }

  emit('AddProperty')
}

function SaveNow(): void {
  let t = tabsStore.activeTab;
  if (t != null && t.path != '') {tabsStore.save(t.path);
  }

  emit('SaveNow')
}

function Cancel(): void {
  entries.value = syncEntries(tabsStore);

  emit('Cancel')
}

function RemoveProperty(idx: any): void {
  entries.value.splice(idx, 1);
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);

  emit('RemoveProperty', idx)
}

function NewValueInput(e: any): void {
  new_value.value = e.target.value;

  emit('NewValueInput', e)
}

function ToggleBool(entry: any): void {
  entry.value = !entry.value;
  commitFrontmatter(tabsStore, entries.value, debounced_save.value);

  emit('ToggleBool', entry)
}

onMounted(() => {
  let run = () => { let tab = tabsStore.activeTab;
  if (tab != null && tab.path != '') {tabsStore.save(tab.path);
  } };
  let f = useDebounceFn(run, 1200);
  debounced_save.value = f;
})


</script>

<template>
    <div class="rounded-lg border bg-background/50 p-2.5">
      <div class="mb-2 flex items-center justify-between">
        <h4 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Properties</span>
        </h4>
        <template v-if="is_dirty">
          <div class="flex items-center gap-1">
            <button class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" :title="'Revert'" :type="'button'" @click="Cancel">
              <component :is="(X) as any" class="h-3 w-3" />
            </button>
            <button class="flex h-5 w-5 items-center justify-center rounded text-primary hover:bg-primary/10" :title="'Save now'" :type="'button'" @click="SaveNow">
              <component :is="(Check) as any" class="h-3 w-3" />
            </button>
          </div>
        </template>
      </div>
      <template v-if="has_entries">
        <div class="space-y-2">
          <div class="group" v-for="entry in display_entries">
            <div class="mb-0.5 flex items-center justify-between">
              <input class="w-full bg-transparent text-[11px] font-medium text-muted-foreground outline-none" :type="'text'" :value="entry.key" @change="Commit(entry)" @input="KeyChanged({ entry: entry, evt: $event })" />
              <button class="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible" :type="'button'" @click="RemoveProperty(entry.idx)">
                <component :is="(Trash2) as any" class="h-3 w-3" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <template v-if="entry.is_bool">
                <button :class="entry.value ? 'h-6 rounded border px-2 text-xs transition-colors border-primary bg-primary/10 text-primary' : 'h-6 rounded border px-2 text-xs transition-colors border-border bg-background text-muted-foreground'" :type="'button'" @click="ToggleBool(entry)">
                  <span>{{ entry.bool_label }}</span>
                </button>
              </template>
              <template v-if="entry.is_date">
                <input class="h-6 w-full rounded border bg-background px-1.5 text-xs outline-none focus:border-primary" :type="'date'" :value="entry.value" @input="ValueChanged({ entry: entry, evt: $event })" />
              </template>
              <template v-if="entry.is_other">
                <input class="h-6 w-full rounded border bg-background px-1.5 text-xs outline-none focus:border-primary" :type="'text'" :value="entry.value" :placeholder="entry.placeholder_text" @input="ValueChanged({ entry: entry, evt: $event })" />
              </template>
              <component :is="(select_tag) as any" class="h-6 rounded border bg-background px-1 text-[10px] uppercase text-muted-foreground outline-none" :value="entry.type" @change="SetType({ idx: entry.idx, evt: $event })">
                <component :is="(option_tag) as any" :value="'text'">
                  <span>text</span>
                </component>
                <component :is="(option_tag) as any" :value="'number'">
                  <span>num</span>
                </component>
                <component :is="(option_tag) as any" :value="'boolean'">
                  <span>bool</span>
                </component>
                <component :is="(option_tag) as any" :value="'date'">
                  <span>date</span>
                </component>
                <component :is="(option_tag) as any" :value="'list'">
                  <span>list</span>
                </component>
              </component>
            </div>
          </div>
        </div>
      </template>
      <template v-if="no_entries">
        <p class="text-xs text-muted-foreground">
          <span>No frontmatter properties.</span>
        </p>
      </template>
      <div class="mt-3 flex items-center gap-1 border-t border-border/50 pt-2">
        <input class="h-6 flex-1 rounded border bg-background px-1.5 text-xs outline-none focus:border-primary" v-model="new_key" :placeholder="'key'" :type="'text'" @keydown.enter="AddProperty" @input="NewKeyInput($event)" />
        <input class="h-6 flex-1 rounded border bg-background px-1.5 text-xs outline-none focus:border-primary" :type="'text'" :placeholder="'value'" v-model="new_value" @input="NewValueInput($event)" @keydown.enter="AddProperty" />
        <button class="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background text-muted-foreground hover:bg-accent hover:text-foreground" :type="'button'" @click="AddProperty">
          <component :is="(Plus) as any" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
