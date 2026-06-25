<script setup lang="ts">
import { computed } from 'vue'
import { wikiTitleToPath } from '@/lib/wikiLink'

const props = defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  create: []
  cancel: []
}>()

const path = computed(() => wikiTitleToPath(props.title))
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg">
      <h3 class="text-base font-semibold">Create missing page?</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        The page <span class="font-medium text-foreground">[[{{ title }}]]</span> does not exist yet.
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        Will be created as <code class="rounded bg-muted px-1 py-0.5">{{ path }}</code>.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          class="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
          @click="emit('create')"
        >
          Create
        </button>
      </div>
    </div>
  </div>
</template>
