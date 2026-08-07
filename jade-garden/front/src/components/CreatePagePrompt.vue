<!-- CreatePagePrompt component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { wikiTitleToPath, CodeTag } from '../../auto/src/front/utils/create_page_prompt_ext'


const page_path = computed<any>(() => wikiTitleToPath(props.title))

const props = defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  Create: []
  Cancel: []
}>()

function Create(): void {

  emit('Create')
}

function Cancel(): void {

  emit('Cancel')
}


</script>

<template>
    <template v-if="open">
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="Cancel">
        <div class="w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg">
          <h3 class="text-base font-semibold">
            <span>Create missing page?</span>
          </h3>
          <p class="mt-2 text-sm text-muted-foreground">
            <span>The page </span>
            <span class="font-medium text-foreground">
              <span>[[{{ title }}]]</span>
            </span>
            <span> does not exist yet.</span>
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            <span>Will be created as </span>
            <component :is="(CodeTag) as any" class="rounded bg-muted px-1 py-0.5">
              <span>{{ page_path }}</span>
            </component>
            <span>.</span>
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" @click="Cancel">
              <span>Cancel</span>
            </button>
            <button class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90" @click="Create">
              <span>Create</span>
            </button>
          </div>
        </div>
      </div>
    </template>

</template>

<style>
/* Component styles */

</style>
