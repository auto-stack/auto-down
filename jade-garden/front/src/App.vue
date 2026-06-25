<script setup lang="ts">
import { ref } from 'vue'
import { AutoDownEditor } from '@autodown/editor'
import { StreamingRenderer } from '@autodown/vue'
import '@autodown/editor/style.css'
import '@autodown/vue/style.css'

const content = ref(`# Jade Garden

An **Obsidian-like** knowledge base editor for AutoDown.

## Features

- Edit and preview .ad files side by side
- Wiki links like [[README]]
- Code blocks with language headers

\`\`\`python
print("hello jade garden")
\`\`\`
`)

function onUpdate(md: string) {
  content.value = md
}

function onSave(md: string) {
  console.log('saved markdown:', md)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex h-12 items-center border-b bg-card px-4 text-sm font-medium">
      <span class="mr-2 text-muted-foreground">Jade Garden</span>
      <span class="text-muted-foreground">/</span>
      <span class="ml-2">Welcome</span>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <section class="flex-1 overflow-auto border-r p-4">
        <AutoDownEditor
          :content="content"
          placeholder="Start typing..."
          @update="onUpdate"
          @save="onSave"
        />
      </section>
      <section class="flex-1 overflow-auto p-4">
        <StreamingRenderer :source="content" :streaming="false" />
      </section>
    </main>
  </div>
</template>
