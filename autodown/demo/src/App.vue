<template>
  <div class="app">
    <header class="toolbar">AutoDown v0.1</header>
    <main ref="workspaceRef" class="workspace">
      <div class="panels">
        <section class="panel left">
          <AutoDownEditor
            ref="editorRef"
            :content="content"
            placeholder="Start typing..."
            class="fill"
            @save="onSave"
            @cancel="onCancel"
            @update="onUpdate"
          />
        </section>
        <section class="panel right">
          <StreamingRenderer
            ref="rendererRef"
            :source="content"
            :streaming="false"
            :placeholder-block-id="editingBlock?.id"
            :placeholder-height="editingBlock?.height"
            class="fill"
          />
        </section>
      </div>
      <div
        class="splitter-hover-zone"
        @mouseenter="hoveringSplitter = true"
        @mouseleave="hoveringSplitter = false"
      />
      <CustomScrollbar
        :scroll-top="scrollTop"
        :scroll-height="scrollHeight"
        :client-height="clientHeight"
        :visible="hoveringSplitter"
        @update:scroll-top="setScrollTop"
        @hover-change="hoveringScrollbar = $event"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AutoDownEditor } from '@autodown/editor'
import { StreamingRenderer } from '@autodown/vue'
import CustomScrollbar from './components/CustomScrollbar.vue'
import { useSyncedScroll } from './composables/useSyncedScroll'
import { useTableColumnResize } from './composables/useTableColumnResize'

const content = ref(`# Heading One

This is a paragraph with **bold**, *italic*, \`inline code\`, and a [link](https://example.com).

## Heading Two

### Heading Three

> This is a blockquote. It should look the same on both sides.

\`\`\`javascript
const foo = 'bar'
console.log(foo)
\`\`\`

\`\`\`rust
fn main() {
    println!("Hello, world!");
}
\`\`\`

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

\`\`\`typescript
interface User {
  id: number
  name: string
  email: string
}
\`\`\`

\`\`\`bash
echo "Hello from bash!"
curl -s https://api.example.com/data | jq '.results'
\`\`\`

\`\`\`
This is plain text code block
with no language specified
\`\`\`

- Bullet item one
- Bullet item two
  - Nested bullet A
  - Nested bullet B

1. Ordered item one
2. Ordered item two

- [x] Task item done
- [ ] Task item pending

| Name | Value | Note |
|------|-------|------|
| Foo  | 1     | Alpha |
| Bar  | 2     | Beta  |
| Baz  | 3     | Gamma |

:::warning Warning
This is a **warning** callout. It uses a light yellow background and an amber title/icon.
:::

:::info Info
This is an **info** callout. It uses a light blue background and a sky-blue title/icon.
:::

:::error Error
This is an **error** callout. It uses a light red background and a red title/icon.
:::

:::details Click to expand
This is a **Details** block. The content is collapsed by default and expanded when the summary is clicked.
:::

$$
E = mc^2
$$

\`\`\`mermaid
graph TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B -->|No| D[End]
\`\`\`

---

![A placeholder image](https://placehold.co/400x100/f3f4f6/9ca3af?text=Image)
`)

function onSave(md: string) {
  console.log('saved:', md)
}

function onCancel() {
  console.log('cancelled')
}

function onUpdate(md: string) {
  content.value = md
}

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<InstanceType<typeof AutoDownEditor> | null>(null)
const rendererRef = ref<InstanceType<typeof StreamingRenderer> | null>(null)

const { scrollTop, scrollHeight, clientHeight, setScrollTop } = useSyncedScroll({
  workspaceRef,
  editorRef,
  rendererRef,
})

// Reserved state for future block-level inline editing box.
const editingBlock = ref<{ id: string; height: number } | null>(null)

const hoveringSplitter = ref(false)
const hoveringScrollbar = ref(false)

const rendererContainerRef = computed(() => rendererRef.value?.containerRef ?? null)
useTableColumnResize(rendererContainerRef)
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  color: #111827;
}

.toolbar {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  font-weight: 600;
  font-size: 1rem;
}

.workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panels {
  display: flex;
  height: 100%;
  width: 100%;
}

.panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel::-webkit-scrollbar {
  display: none;
}

.panel {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.left {
  border-right: 1px solid #e5e7eb;
}

.left :deep(.autodown-editor) {
  border: none;
  border-radius: 0;
}

.left :deep(.autodown-editor-content-wrapper) {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.left :deep(.autodown-editor-content-wrapper)::-webkit-scrollbar {
  display: none;
}

.right :deep(.streaming-document) {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Create a block formatting context so child margins do not collapse
     through the top padding of the scrolling container. */
  display: flow-root;
}

.right :deep(.streaming-document)::-webkit-scrollbar {
  display: none;
}

.right .fill {
  padding: 1rem 1.25rem;
}

.fill {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.splitter-hover-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 16px;
  transform: translateX(-50%);
  z-index: 11;
  cursor: default;
  background: transparent;
  pointer-events: auto;
}

.splitter-hover-zone::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: rgba(0, 0, 0, 0.12);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.splitter-hover-zone:hover::after {
  opacity: 1;
}
</style>
