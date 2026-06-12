<template>
  <div class="app">
    <header class="toolbar">AutoDown v0.1</header>
    <main class="workspace">
      <section class="panel left">
        <AutoDownEditor
          :content="content"
          placeholder="Start typing..."
          class="fill"
          @save="onSave"
          @cancel="onCancel"
          @update="onUpdate"
        />
      </section>
      <section ref="rightPanelRef" class="panel right">
        <StreamingRenderer :source="content" :streaming="false" class="fill" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AutoDownEditor } from '@autodown/editor'
import { StreamingRenderer } from '@autodown/vue'
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

const rightPanelRef = ref<HTMLElement | null>(null)
useTableColumnResize(rightPanelRef)
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
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
}

.panel::-webkit-scrollbar {
  width: 6px;
}

.panel::-webkit-scrollbar-track {
  background: transparent;
}

.panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.left {
  border-right: 1px solid #e5e7eb;
}

.left :deep(.autodown-editor) {
  border: none;
  border-radius: 0;
}

.right .fill {
  padding: 1rem 1.25rem;
}

.fill {
  flex: 1;
  min-height: 0;
}
</style>
