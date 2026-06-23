<template>
  <div ref="containerRef" class="streaming-document">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MarkdownRender, enableKatex, enableMermaid } from 'markstream-vue'
import { common, createLowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'
import { useStreamingDocument } from './useStreamingDocument'
import StreamingTable from './StreamingTable.vue'

const lowlight = createLowlight(common)

enableKatex()
enableMermaid()

const props = defineProps<{
  source: string
  streaming?: boolean
  placeholderBlockId?: string
  placeholderHeight?: number
}>()

const sourceRef = computed(() => transformDetailsContainers(props.source))
const { segments } = useStreamingDocument(sourceRef)

function transformDetailsContainers(text: string): string {
  // Convert :::details Summary\n...\n::: into native <details> HTML so the
  // preview renderer (markstream-vue) lets the browser handle collapse/expand.
  return text.replace(
    /:::details\s+(.*?)\n([\s\S]*?)\n:::/g,
    '<details>\n<summary>$1</summary>\n$2\n</details>'
  )
}

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

const containerRef = ref<HTMLElement | null>(null)

function clearPlaceholders(container: HTMLElement) {
  container.querySelectorAll('.autodown-block-placeholder').forEach((el) => el.remove())
}

const COPY_ICON = '<span class="codeblock-copy-icon"></span>'

const mutationObserver = new MutationObserver(() => {
  if (containerRef.value) {
    applyBlockIdsAndPlaceholder(containerRef.value)
    highlightCodeBlocks(containerRef.value)
    addCodeBlockHeaders(containerRef.value)
    wrapDetailsContent(containerRef.value)
  }
})

function getTopLevelBlockType(content: Element, nodeType: string | null): string | null {
  const child = content.firstElementChild
  if (!child) return null
  const tag = child.tagName.toLowerCase()
  if (['h1', 'h2', 'h3', 'p', 'pre', 'blockquote', 'ul', 'ol', 'hr', 'img', 'table'].includes(tag)) {
    return tag
  }
  if (child.classList.contains('table-node-wrapper')) return 'table'
  if (child.classList.contains('image-error')) return 'img'
  if (child.classList.contains('autodown-image-wrapper')) return 'img'
  if (child.querySelector('.image-node-container, .image-node__img')) return 'img'
  if (child.classList.contains('autodown-callout') || child.classList.contains('admonition')) return 'callout'
  if (child.classList.contains('autodown-details') || child.classList.contains('html-block-node')) return 'details'
  if (child.classList.contains('autodown-math-block') || child.classList.contains('math-block')) return 'math'
  if (child.classList.contains('mermaid-block-container')) return 'mermaid'
  // Fallback to markstream's node type so newly-added component blocks are
  // treated as top-level blocks without needing an explicit class list.
  if (nodeType && nodeType !== 'text') return nodeType
  return null
}

function isWrapperBlockType(type: string | null) {
  return (
    type === 'blockquote' ||
    type === 'ul' ||
    type === 'ol' ||
    type === 'callout' ||
    type === 'admonition'
  )
}

function applyBlockIdsAndPlaceholder(container: HTMLElement) {
  const slots = Array.from(container.querySelectorAll('.node-slot'))
  const topLevelBlocks: { slot: Element; content: Element; type: string; top: number; height: number }[] = []

  // Clear previously assigned block IDs so that nested content from earlier
  // runs does not leak into the block map used by scroll sync.
  slots.forEach((slot) => {
    const content = slot.querySelector('.node-content')
    if (content) {
      content.removeAttribute('data-block-id')
      content.removeAttribute('data-block-index')
    }
  })

  const containerRect = container.getBoundingClientRect()

  slots.forEach((slot) => {
    const content = slot.querySelector('.node-content')
    if (!content) return

    const nodeType = slot.getAttribute('data-node-type')
    const type = getTopLevelBlockType(content, nodeType)
    if (!type) return

    const htmlSlot = slot as HTMLElement
    const rect = htmlSlot.getBoundingClientRect()
    const top = rect.top - containerRect.top
    const height = rect.height

    // Skip nested slots that fall inside a previously-seen wrapper block
    // (e.g. list items inside a <ul>/<ol> or paragraphs inside a <blockquote>).
    const insideWrapper = topLevelBlocks.some((b) => {
      if (!isWrapperBlockType(b.type)) return false
      return top >= b.top && top < b.top + b.height
    })
    if (insideWrapper) return

    // Skip duplicate slots that share the exact same position as the previous
    // block (some markstream blocks are rendered twice).
    const prev = topLevelBlocks[topLevelBlocks.length - 1]
    if (prev && top === prev.top && height === prev.height) return

    topLevelBlocks.push({ slot, content, type, top, height })
  })

  topLevelBlocks.forEach(({ content }, index) => {
    const blockId = `block-${index}`
    content.setAttribute('data-block-id', blockId)
    content.setAttribute('data-block-index', String(index))
  })

  // Placeholder is inserted into the slot that matches the requested block id.
  if (props.placeholderBlockId != null && props.placeholderHeight != null) {
    const target = topLevelBlocks[Number(props.placeholderBlockId.replace('block-', ''))]
    if (target) {
      const existing = target.slot.querySelector(':scope > .autodown-block-placeholder')
      if (!existing) {
        const placeholder = document.createElement('div')
        placeholder.className = 'autodown-block-placeholder'
        placeholder.style.height = `${props.placeholderHeight}px`
        target.slot.insertBefore(placeholder, target.slot.firstChild)
      }
    }
  }
}

async function refresh() {
  if (!containerRef.value) return
  await nextTick()
  clearPlaceholders(containerRef.value)
  applyBlockIdsAndPlaceholder(containerRef.value)
  highlightCodeBlocks(containerRef.value)
  addCodeBlockHeaders(containerRef.value)
  wrapDetailsContent(containerRef.value)
}

/**
 * Inject a real header bar (language label + copy button) into code blocks.
 * This mirrors the editor's DOM structure so both sides share the same layout
 * and hover effects.
 */
function addCodeBlockHeaders(container: HTMLElement) {
  const blocks = Array.from(
    container.querySelectorAll('pre[data-language]:not([data-header-added])')
  )
  blocks.forEach((pre) => {
    const language = pre.getAttribute('data-language') || ''
    const badge = document.createElement('div')
    badge.className = 'codeblock-language-badge'
    badge.setAttribute('data-codeblock-language-badge', language)

    const label = document.createElement('span')
    label.className = 'codeblock-language-label'
    label.textContent = language

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'codeblock-copy-btn'
    btn.setAttribute('data-codeblock-copy-btn', '')
    btn.setAttribute('title', '复制')
    btn.innerHTML = COPY_ICON

    badge.appendChild(label)
    badge.appendChild(btn)
    pre.appendChild(badge)
    pre.setAttribute('data-header-added', '')
  })
}

/**
 * Wrap the body of each native <details> element (everything except <summary>)
 * in a .details-content container so we can apply consistent padding and
 * margins without affecting the summary row.
 */
function wrapDetailsContent(container: HTMLElement) {
  const detailsBlocks = Array.from(
    container.querySelectorAll('details:not([data-details-wrapped])')
  )
  detailsBlocks.forEach((details) => {
    const children = Array.from(details.children).filter((child) => {
      const tag = child.tagName.toLowerCase()
      return tag !== 'summary' && tag !== 'details' && !child.classList.contains('details-content')
    })
    if (children.length === 0) return

    const wrapper = document.createElement('div')
    wrapper.className = 'details-content'
    children.forEach((child) => wrapper.appendChild(child))
    details.appendChild(wrapper)
    details.setAttribute('data-details-wrapped', '')
  })
}

function handleContainerClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const copyBtn = target.closest?.('[data-codeblock-copy-btn]') as HTMLElement | null
  if (!copyBtn || !containerRef.value) return
  const pre = copyBtn.closest('pre')
  const code = pre?.querySelector('code')?.textContent ?? ''
  event.preventDefault()
  event.stopPropagation()
  navigator.clipboard.writeText(code)
}

/**
 * Apply lowlight syntax highlighting to code blocks rendered by markstream-vue.
 * The original `<code>` content is replaced by highlighted tokens whenever a
 * non-text language is available and registered.
 */
function highlightCodeBlocks(container: HTMLElement) {
  const codeBlocks = Array.from(container.querySelectorAll('pre[data-language] > code'))
  codeBlocks.forEach((code) => {
    const pre = code.parentElement as HTMLPreElement
    const rawLanguage = pre.getAttribute('data-language')
    const language = rawLanguage === 'plaintext' ? 'text' : rawLanguage
    if (!language || language === 'text' || code.getAttribute('data-highlighted') === language) return
    if (!lowlight.registered(language)) return

    const text = code.textContent || ''
    if (!text) return

    try {
      const tree = lowlight.highlight(language, text)
      code.innerHTML = toHtml(tree)
      code.setAttribute('data-highlighted', language)
    } catch {
      // Unknown language or malformed input; leave plain text intact.
    }
  })
}

watch(
  () => [segments.value, props.placeholderBlockId, props.placeholderHeight],
  () => refresh(),
  { deep: true, flush: 'post' }
)

onMounted(() => {
  if (!containerRef.value) return
  mutationObserver.observe(containerRef.value, { childList: true, subtree: true })
  containerRef.value.addEventListener('click', handleContainerClick, { capture: true })
})

onBeforeUnmount(() => {
  mutationObserver.disconnect()
  containerRef.value?.removeEventListener('click', handleContainerClick, { capture: true })
})

defineExpose({
  containerRef,
})
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

/* Admonition / Callout — override markstream-vue defaults to match editor */
.streaming-document :deep(.admonition) {
  position: relative !important;
  margin: 1rem 0 !important;
  border-radius: 12px !important;
  padding: 1.1rem 1rem 1rem !important;
  overflow: visible !important;
}

.streaming-document :deep(.admonition-legend) {
  position: absolute !important;
  top: 0 !important;
  left: 0.75rem !important;
  transform: translateY(-50%) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.35rem !important;
  padding: 0 0.5rem !important;
  background: var(--ad-surface, #ffffff) !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  line-height: 1 !important;
}

.streaming-document :deep(.admonition-icon) {
  width: 1rem !important;
  height: 1rem !important;
}

.streaming-document :deep(.admonition-content) {
  padding: 0 !important;
  color: #111827 !important;
}

.streaming-document :deep(.admonition-content) > .markdown-renderer > *:first-child {
  margin-top: 0 !important;
}

.streaming-document :deep(.admonition-content) > .markdown-renderer > *:last-child {
  margin-bottom: 0 !important;
}

.streaming-document :deep(.admonition-note) {
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
}
.streaming-document :deep(.admonition-note) .admonition-legend {
  color: #2563eb !important;
}
.streaming-document :deep(.admonition-info) {
  background: #f0f9ff !important;
  border: 1px solid #7dd3fc !important;
}
.streaming-document :deep(.admonition-info) .admonition-legend {
  color: #0284c7 !important;
}
.streaming-document :deep(.admonition-tip) {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
}
.streaming-document :deep(.admonition-tip) .admonition-legend {
  color: #16a34a !important;
}
.streaming-document :deep(.admonition-warning),
.streaming-document :deep(.admonition-caution) {
  background: #fffbeb !important;
  border: 1px solid #fcd34d !important;
}
.streaming-document :deep(.admonition-warning) .admonition-legend,
.streaming-document :deep(.admonition-caution) .admonition-legend {
  color: #d97706 !important;
}
.streaming-document :deep(.admonition-danger),
.streaming-document :deep(.admonition-error) {
  background: #fef2f2 !important;
  border: 1px solid #fca5a5 !important;
}
.streaming-document :deep(.admonition-danger) .admonition-legend,
.streaming-document :deep(.admonition-error) .admonition-legend {
  color: #dc2626 !important;
}

/* Details / Summary — keep native <details> but style consistently */
.streaming-document :deep(details) {
  margin: 0.75rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.streaming-document :deep(details summary) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: hsl(220 9% 46% / 0.06);
  border-bottom: 1px solid transparent;
  font-weight: 500;
  font-size: 0.9rem;
  color: #111827;
  user-select: none;
  cursor: pointer;
  list-style: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.streaming-document :deep(details summary::-webkit-details-marker) {
  display: none;
}

.streaming-document :deep(details[open] summary) {
  border-bottom-color: #e5e7eb;
}

.streaming-document :deep(details summary:hover) {
  background: hsl(220 9% 46% / 0.1);
}

.streaming-document :deep(details summary::before) {
  content: '▶';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.7rem;
  color: #6b7280;
  transition: transform 0.15s ease;
}

.streaming-document :deep(details[open] summary::before) {
  transform: rotate(90deg);
}

.streaming-document :deep(details .details-content) {
  display: block;
  padding: 0.75rem 0.75rem 0.75rem 2rem;
  background: hsl(220 9% 46% / 0.02);
}

.streaming-document :deep(details .details-content) > :first-child {
  margin-top: 0 !important;
}

.streaming-document :deep(details .details-content) > :last-child {
  margin-bottom: 0 !important;
}

.streaming-document :deep(details .details-content) p,
.streaming-document :deep(details .details-content) .paragraph-node {
  margin: 0.5rem 0 !important;
}

/* Plain-text code blocks (markstream-vue defaults missing language to 'plaintext') */
.streaming-document :deep(pre[data-language="text"]),
.streaming-document :deep(pre[data-language="plaintext"]) {
  position: relative;
  margin: 0.75rem 0;
  padding: 2rem 1rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8f9fa;
  overflow-x: auto;
}

/* Hide the pseudo-element header when a real header bar has been injected */
.streaming-document :deep(pre[data-language][data-header-added])::before {
  display: none;
}

/* Language header bar (injected element) */
.streaming-document :deep(pre[data-language] .codeblock-language-badge) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  height: 1.9rem;
  box-sizing: border-box;
  padding: 0.35rem 0.5rem 0.35rem 0.75rem;
  background: hsl(220 9% 46% / 0.08);
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.5;
  color: #6b7280;
  user-select: none;
  pointer-events: auto;
  white-space: nowrap;
  overflow: hidden;
}

.streaming-document :deep(pre[data-language] .codeblock-language-label) {
  position: relative;
  margin-right: 20px;
  cursor: default;
  text-transform: lowercase;
}

.streaming-document :deep(pre[data-language] .codeblock-language-label::after) {
  content: '▼';
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.55rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.streaming-document :deep(pre[data-language] .codeblock-language-label:hover::after) {
  opacity: 1;
}

.streaming-document :deep(pre[data-language] .codeblock-language-label:hover) {
  color: #111827;
}

/* Copy button for code blocks */
.streaming-document :deep(pre[data-language] .codeblock-copy-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  line-height: 1;
}

.streaming-document :deep(pre[data-language] .codeblock-copy-btn:hover) {
  background: hsl(220 9% 46% / 0.14);
  color: #111827;
}

.streaming-document :deep(pre[data-language] .codeblock-copy-icon) {
  display: inline-block;
  width: 14px;
  height: 14px;
  -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iOSIgeT0iOSIgd2lkdGg9IjEzIiBoZWlnaHQ9IjEzIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNNSAxNUg0YTIgMiAwIDAgMS0yLTJWNGEyIDIgMCAwIDEgMi0yaDlhMiAyIDAgMCAxIDIgMnYxIi8+PC9zdmc+");
  mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iOSIgeT0iOSIgd2lkdGg9IjEzIiBoZWlnaHQ9IjEzIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNNSAxNUg0YTIgMiAwIDAgMS0yLTJWNGEyIDIgMCAwIDEgMi0yaDlhMiAyIDAgMCAxIDIgMnYxIi8+PC9zdmc+");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  background-color: currentColor;
}

/* Code blocks — window style with header bar */
.streaming-document :deep(pre[data-language]) {
  position: relative;
  margin: 0.75rem 0;
  padding: 2rem 1rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8f9fa;
  overflow-x: auto;
}

/* Code blocks without a language — treated as plain text */
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

/* ─── Lowlight syntax highlighting tokens (preview) ───
   Match the editor's light theme token colors. */
.streaming-document :deep(pre code .hljs-keyword),
.streaming-document :deep(pre code .hljs-selector-tag),
.streaming-document :deep(pre code .hljs-doctag),
.streaming-document :deep(pre code .hljs-section) {
  color: #d73a49;
  font-weight: 600;
}

.streaming-document :deep(pre code .hljs-title),
.streaming-document :deep(pre code .hljs-title.function_),
.streaming-document :deep(pre code .hljs-function .hljs-title) {
  color: #6f42c1;
}

.streaming-document :deep(pre code .hljs-string),
.streaming-document :deep(pre code .hljs-regexp),
.streaming-document :deep(pre code .hljs-addition) {
  color: #032f62;
}

.streaming-document :deep(pre code .hljs-number),
.streaming-document :deep(pre code .hljs-literal),
.streaming-document :deep(pre code .hljs-variable),
.streaming-document :deep(pre code .hljs-template-variable),
.streaming-document :deep(pre code .hljs-attr),
.streaming-document :deep(pre code .hljs-attribute) {
  color: #005cc5;
}

.streaming-document :deep(pre code .hljs-comment),
.streaming-document :deep(pre code .hljs-quote),
.streaming-document :deep(pre code .hljs-deletion) {
  color: #6a737d;
  font-style: italic;
}

.streaming-document :deep(pre code .hljs-meta),
.streaming-document :deep(pre code .hljs-meta-keyword),
.streaming-document :deep(pre code .hljs-meta-string) {
  color: #176f2c;
}

.streaming-document :deep(pre code .hljs-tag),
.streaming-document :deep(pre code .hljs-name),
.streaming-document :deep(pre code .hljs-built_in),
.streaming-document :deep(pre code .hljs-type) {
  color: #22863a;
}

.streaming-document :deep(pre code .hljs-emphasis) {
  font-style: italic;
}

.streaming-document :deep(pre code .hljs-strong) {
  font-weight: 700;
}

/* Math blocks — reserve the same vertical space as the editor's bordered block */
.streaming-document :deep(.math-block) {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  box-sizing: border-box;
}

.streaming-document :deep(.math-block .katex-display) {
  margin: 0 !important;
}

/* Mermaid blocks — markstream-vue uses Tailwind utility classes that are not
   available in this project, so we provide explicit fallback styles. */
.streaming-document :deep(.mermaid-block-container) {
  margin: 0.75rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.streaming-document :deep(.mermaid-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.9rem;
  padding: 0.35rem 0.5rem 0.35rem 0.75rem;
  background: hsl(220 9% 46% / 0.08);
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.streaming-document :deep(.mermaid-block-header) > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.streaming-document :deep(.mermaid-label-text) {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: lowercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.streaming-document :deep(.mermaid-mode-toggle-group),
.streaming-document :deep(.mermaid-header-actions) {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.streaming-document :deep(.mermaid-mode-btn),
.streaming-document :deep(.mermaid-action-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.25rem 0.4rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.streaming-document :deep(.mermaid-mode-btn.is-active),
.streaming-document :deep(.mermaid-mode-btn:hover),
.streaming-document :deep(.mermaid-action-btn:hover) {
  background: hsl(220 9% 46% / 0.14);
  color: #111827;
}

.streaming-document :deep(.mermaid-block-header .action-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}

.streaming-document :deep(.mermaid-block-container) > div:not(.mermaid-block-header) .relative {
  position: relative;
}

.streaming-document :deep(.mermaid-block-container) > div:not(.mermaid-block-header) .absolute.top-2.right-2 {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.streaming-document :deep(.mermaid-block-container) > div:not(.mermaid-block-header) .absolute.top-2.right-2 > .flex {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.streaming-document :deep(.mermaid-preview-area) {
  max-height: 320px;
  overflow: auto;
  background: #ffffff;
}

.streaming-document :deep(.mermaid-source-panel) {
  padding: 0.75rem 1rem;
  background: #f8f9fa;
}

.streaming-document :deep(.mermaid-source-code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
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

/* Override markstream-vue code block chrome (Tailwind classes are not available here) */
.streaming-document :deep(.code-block-container) {
  border: 1px solid #e5e7eb !important;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb !important;
}

.streaming-document :deep(.code-editor-container.is-hidden) {
  display: none !important;
}

/* Use markstream's own header bar, but give it concrete layout/size because
   Tailwind utility classes are not present. */
.streaming-document :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 36px;
  padding: 0 0.75rem;
  background: #e5e7eb;
  border-bottom: 1px solid #d1d5db;
  color: #374151;
  font-size: 0.85rem;
}

.streaming-document :deep(.code-block-header svg) {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.streaming-document :deep(.code-block-header .code-header-main) {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.streaming-document :deep(.code-block-header > .flex) {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.streaming-document :deep(.code-block-header button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: inherit;
}

.streaming-document :deep(.code-block-header button svg) {
  width: 16px;
  height: 16px;
}

/* Our own injected badge duplicates the header info, so hide it in preview. */
.streaming-document :deep(pre[data-language] .codeblock-language-badge) {
  display: none;
}

.streaming-document :deep(pre[data-language]) {
  padding: 0.85em 1em !important;
  margin: 0;
  background: #f9fafb;
  border: none !important;
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
