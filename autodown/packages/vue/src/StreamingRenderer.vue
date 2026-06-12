<template>
  <div class="streaming-document">
    <template v-for="(segment, idx) in segments" :key="segment.type + '-' + idx">
      <MarkdownRender
        v-if="segment.type === 'markdown'"
        :content="segment.text"
        :final="!streaming"
        :max-live-nodes="streaming ? 0 : 320"
        :batch-rendering="streaming"
        :render-batch-size="16"
        :render-batch-delay="8"
        :typewriter="streaming && idx === lastMarkdownIndex"
        :fade="false"
        :code-block-props="codeBlockProps"
      />
      <component
        v-else-if="segment.type === 'component'"
        :is="registry[segment.componentType]"
        v-bind="segment.props"
        :final="segment.final"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MarkdownRender } from 'markstream-vue'
import { useStreamingDocument } from './useStreamingDocument'
import StreamingTable from './StreamingTable.vue'

const props = defineProps<{
  source: string
  streaming?: boolean
}>()

const sourceRef = computed(() => props.source)
const { segments } = useStreamingDocument(sourceRef)

const lastMarkdownIndex = computed(() => {
  for (let i = segments.value.length - 1; i >= 0; i--) {
    if (segments.value[i].type === 'markdown') return i
  }
  return -1
})

const codeBlockProps = {
  showHeader: true,
  showCopyButton: true,
  showExpandButton: true,
}

const registry: Record<string, any> = {
  table: StreamingTable,
  // Future: chart: StreamingChart, form: StreamingForm, ...
}
</script>

<style scoped>
/* Segment spacing */
.streaming-document > * + * {
  margin-top: 0.75rem;
}

/* ---------- Base typography (match @autodown/editor) ---------- */
.streaming-document :deep(.markstream-vue) {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #111827;
}

/* Headings */
.streaming-document :deep(h1),
.streaming-document :deep(h2),
.streaming-document :deep(h3) {
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
  color: #111827;
}

.streaming-document :deep(h1) {
  font-size: 1.58rem;
}

.streaming-document :deep(h2) {
  font-size: 1.33rem;
}

.streaming-document :deep(h3) {
  font-size: 1.18rem;
}

/* Paragraphs */
.streaming-document :deep(p) {
  margin: 0.5rem 0;
}

/* Lists */
.streaming-document :deep(ul),
.streaming-document :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.streaming-document :deep(ul) {
  list-style-type: disc;
}

.streaming-document :deep(ol) {
  list-style-type: decimal;
}

.streaming-document :deep(li) {
  margin: 0.25rem 0;
}

/* Blockquote */
.streaming-document :deep(blockquote) {
  margin: 0.75rem 0;
  padding-left: 1rem;
  border-left: 3px solid #e5e7eb;
  color: #6b7280;
}

/* Code blocks — window style (CSS-only, works without stream-monaco) */
.streaming-document :deep(pre[data-language]) {
  position: relative;
  margin: 0.75rem 0;
  padding: 2rem 1rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8f9fa;
  overflow-x: auto;
}

/* Language header bar — rendered via ::before using data-language attr */
.streaming-document :deep(pre[data-language]:not([data-language="plaintext"]))::before {
  content: attr(data-language);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.4rem 0.75rem;
  background: hsl(220 9% 46% / 0.08);
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: lowercase;
  text-align: right;
  user-select: none;
  pointer-events: none;
}

/* Plaintext blocks — no header bar, remove extra top padding */
.streaming-document :deep(pre[data-language="plaintext"]) {
  padding-top: 0.75rem;
}

/* Code blocks without a language — simpler style */
.streaming-document :deep(pre:not([data-language])) {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8f9fa;
  overflow-x: auto;
}

.streaming-document :deep(pre code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  background: none;
  padding: 0;
  border: none;
  color: #111827;
}

/* Inline code */
.streaming-document :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
  background: hsl(220 9% 46% / 0.08);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  color: #111827;
}

/* Links */
.streaming-document :deep(a) {
  color: hsl(220 90% 56%);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.streaming-document :deep(a:hover) {
  opacity: 0.8;
}

/* Images */
.streaming-document :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5rem 0;
  display: block;
}

/* Broken image fallback (markstream-vue renders .image-error) */
.streaming-document :deep(.image-error) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 50px;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0;
  background: hsl(220 9% 46% / 0.06);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 0.85rem;
}

.streaming-document :deep(.image-error svg) {
  display: none;
}

.streaming-document :deep(.image-error span)::before {
  content: '🖼️ ';
}

/* Override markstream-vue list spacing to match editor */
.streaming-document :deep(.list-node) {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
  padding-left: 1.25rem !important;
}

/* Horizontal rule */
.streaming-document :deep(hr) {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

/* ---------- Tables (markstream-vue rendered) ---------- */
.streaming-document :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
}

.streaming-document :deep(th),
.streaming-document :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.9rem 0.6rem;
  text-align: left;
  box-sizing: border-box;
  font-size: 0.95rem;
}

.streaming-document :deep(th) {
  background: hsl(220 9% 46% / 0.06);
  font-weight: 600;
}

.streaming-document :deep(tr:nth-child(even)) {
  background: #f9fafb;
}

/* ---------- Task list ---------- */
.streaming-document :deep(ul):has(.checkbox-node) {
  list-style: none;
  padding-left: 0;
}

.streaming-document :deep(li):has(.checkbox-node) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
}

.streaming-document :deep(.checkbox-icon.checkbox-checked) {
  color: hsl(220 90% 56%);
}

.streaming-document :deep(.checkbox-icon.checkbox-unchecked) {
  color: #9ca3af;
}

.streaming-document :deep(.checkbox-icon.checkbox-checked path) {
  stroke: white;
}

.streaming-document :deep(.checkbox-node) {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}

/* Hide markstream-vue built-in resize handle */
.streaming-document :deep(.table-node__resize-handle) {
  display: none !important;
}
</style>
