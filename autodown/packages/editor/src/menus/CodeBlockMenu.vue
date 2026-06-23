<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="autodown-codeblock-menu"
    :style="positionStyle"
  >
    <div class="autodown-codeblock-menu-header">
      <input
        ref="searchRef"
        v-model="search"
        class="autodown-codeblock-menu-search"
        placeholder="Search language…"
        @keydown.escape="close"
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="selectHighlighted"
      />
    </div>
    <div ref="listRef" class="autodown-codeblock-menu-list">
      <button
        v-for="(lang, idx) in filteredLanguages"
        :key="lang.id"
        :ref="(el) => setItemRef(el as HTMLElement, idx)"
        class="autodown-codeblock-menu-item"
        :class="{ active: idx === highlightedIndex, selected: lang.id === currentLanguage }"
        @click="selectLanguage(lang.id)"
        @mouseenter="highlightedIndex = idx"
      >
        <span class="autodown-codeblock-menu-item-label">{{ lang.label }}</span>
        <Check v-if="lang.id === currentLanguage" :size="13" class="autodown-codeblock-menu-check" />
      </button>
      <div v-if="filteredLanguages.length === 0" class="autodown-codeblock-menu-empty">
        No matching languages
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/core'
import { Check } from 'lucide-vue-next'
import { useMenuBounds, type TriggerRect } from '../composables/useMenuBounds'

const props = defineProps<{
  editor: Editor
}>()

interface LanguageOption {
  id: string
  label: string
  aliases?: string[]
}

const languages: LanguageOption[] = [
  { id: 'text', label: 'Text' },
  { id: 'bash', label: 'Bash', aliases: ['sh', 'shell', 'zsh'] },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++', aliases: ['c++', 'cxx'] },
  { id: 'csharp', label: 'C#', aliases: ['c#', 'cs'] },
  { id: 'css', label: 'CSS' },
  { id: 'dockerfile', label: 'Dockerfile', aliases: ['docker'] },
  { id: 'go', label: 'Go', aliases: ['golang'] },
  { id: 'html', label: 'HTML' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript', aliases: ['js'] },
  { id: 'json', label: 'JSON' },
  { id: 'kotlin', label: 'Kotlin', aliases: ['kt'] },
  { id: 'lua', label: 'Lua' },
  { id: 'markdown', label: 'Markdown', aliases: ['md'] },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python', aliases: ['py'] },
  { id: 'r', label: 'R' },
  { id: 'ruby', label: 'Ruby', aliases: ['rb'] },
  { id: 'rust', label: 'Rust', aliases: ['rs'] },
  { id: 'scss', label: 'SCSS', aliases: ['sass'] },
  { id: 'sql', label: 'SQL' },
  { id: 'swift', label: 'Swift' },
  { id: 'toml', label: 'TOML' },
  { id: 'typescript', label: 'TypeScript', aliases: ['ts', 'tsx'] },
  { id: 'xml', label: 'XML' },
  { id: 'yaml', label: 'YAML', aliases: ['yml'] },
]

const visible = ref(false)
const menuRef = ref<HTMLDivElement>()
const searchRef = ref<HTMLInputElement>()
const listRef = ref<HTMLDivElement>()
const itemRefs = ref<HTMLElement[]>([])
const search = ref('')
const highlightedIndex = ref(0)
const { positionStyle, applyPosition } = useMenuBounds(menuRef)

function setItemRef(el: HTMLElement, idx: number) {
  if (el) itemRefs.value[idx] = el
}

/** Track the active code block so we can position the menu relative to its badge. */
const activeCodeBlock = ref<HTMLElement | null>(null)

const currentLanguage = computed(() => {
  const attrs = props.editor.getAttributes('codeBlock')
  return (attrs.language as string) ?? ''
})

const filteredLanguages = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return languages
  return languages.filter((lang) => {
    const haystack = [lang.id, lang.label, ...(lang.aliases ?? [])].join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

function selectLanguage(langId: string) {
  props.editor.chain().focus().setCodeBlock({ language: langId }).run()
  close()
}

function open(target?: HTMLElement) {
  activeCodeBlock.value = target ?? findActiveCodeBlock() ?? null
  visible.value = true
  search.value = ''
  highlightedIndex.value = Math.max(0, languages.findIndex((l) => l.id === currentLanguage.value))
  nextTick(() => {
    searchRef.value?.focus()
    updatePosition()
    scrollHighlightedIntoCenter()
  })
}

function scrollHighlightedIntoCenter() {
  nextTick(() => {
    const list = listRef.value
    const item = itemRefs.value[highlightedIndex.value]
    if (!list || !item) return
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const offset = itemRect.top - listRect.top - listRect.height / 2 + itemRect.height / 2
    list.scrollTop += offset
  })
}

function close() {
  visible.value = false
  search.value = ''
  highlightedIndex.value = 0
  activeCodeBlock.value = null
}

function toggle(target?: HTMLElement) {
  if (visible.value) close()
  else open(target)
}

function moveDown() {
  if (highlightedIndex.value < filteredLanguages.value.length - 1) {
    highlightedIndex.value++
    scrollHighlightedIntoCenter()
  }
}

function moveUp() {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
    scrollHighlightedIntoCenter()
  }
}

function selectHighlighted() {
  if (filteredLanguages.value.length === 1) {
    selectLanguage(filteredLanguages.value[0].id)
    return
  }
  const lang = filteredLanguages.value[highlightedIndex.value]
  if (lang) selectLanguage(lang.id)
}



function findActiveCodeBlock(): HTMLElement | null {
  const { view } = props.editor
  const { selection } = view.state
  const el = view.nodeDOM(selection.from) as HTMLElement | null
  if (!el) return null
  return (
    (el.closest?.('pre[data-language]') as HTMLElement | null) ??
    (el.closest?.('.autodown-codeblock-node') as HTMLElement | null) ??
    null
  )
}

function updatePosition() {
  const { view } = props.editor
  const editorEl = view.dom.closest('.autodown-editor') as HTMLElement | null
  if (!editorEl) return
  const editorRect = editorEl.getBoundingClientRect()

  const triggerEl = activeCodeBlock.value ?? findActiveCodeBlock()
  if (!triggerEl) {
    close()
    return
  }

  const badge = triggerEl.querySelector('[data-codeblock-language-badge]') as HTMLElement | null
  const triggerRect = (badge ?? triggerEl).getBoundingClientRect()
  const badgeStyle = badge ? getComputedStyle(badge) : null
  const lineHeight = badgeStyle
    ? parseInt(badgeStyle.lineHeight, 10) || triggerRect.height
    : triggerRect.height
  const verticalPadding = badgeStyle
    ? parseFloat(badgeStyle.paddingTop) + parseFloat(badgeStyle.paddingBottom)
    : 0
  // Position the menu just below the language badge (header bar). A small
  // fixed gap of 6px is enough visual separation; larger offsets made the
  // menu land near the bottom of short code blocks.
  const offset = 6
  const trigger: TriggerRect = {
    top: triggerRect.top - editorRect.top + offset,
    left: triggerRect.left - editorRect.left,
    bottom: triggerRect.bottom - editorRect.top + offset,
    right: triggerRect.right - editorRect.left,
    width: triggerRect.width,
    height: triggerRect.height,
  }

  applyPosition(
    trigger,
    { width: editorRect.width, height: editorRect.height },
    { placement: 'bottom-end', gap: 0 }
  )
}

let rafId: number | null = null
function scheduleUpdate() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    if (visible.value) updatePosition()
    rafId = null
  })
}

watch(
  () => props.editor?.state.selection,
  () => {
    if (visible.value) {
      // If the user moves the cursor out of a code block, keep the menu open
      // as long as it is still inside the same code block.
      scheduleUpdate()
    }
  }
)

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const menu = menuRef.value
  if (menu && !menu.contains(target)) {
    close()
  }
}

/**
 * Lock page/workspace scrolling while the language menu is open.
 * Wheel events are captured at the document level so that external scroll
 * containers (e.g. the demo's synced workspace) cannot scroll. If the wheel
 * happens over the menu's language list, we scroll that list instead.
 */
function handleGlobalWheel(event: WheelEvent) {
  if (!visible.value) return

  const menu = menuRef.value
  if (menu && menu.contains(event.target as Node)) {
    event.preventDefault()
    event.stopPropagation()

    const list = listRef.value
    if (!list) return
    const canScrollDown = list.scrollTop + list.clientHeight < list.scrollHeight
    const canScrollUp = list.scrollTop > 0
    const deltaY = event.deltaY

    // Only apply the wheel delta when the list can actually move in that
    // direction; otherwise the list stays at its boundary and the page does
    // not scroll behind it.
    if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
      list.scrollTop += deltaY
    }
    return
  }

  // Outside the menu: suppress all wheel scrolling until the menu is closed.
  event.preventDefault()
  event.stopPropagation()
}

function handleEditorMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement
  const badge = target.closest?.('[data-codeblock-language-badge]') as HTMLElement | null
  const copyBtn = target.closest?.('[data-codeblock-copy-btn]') as HTMLElement | null
  const expandBtn = target.closest?.('[data-codeblock-expand-btn]') as HTMLElement | null
  const moreBtn = target.closest?.('[data-codeblock-more-btn]') as HTMLElement | null
  if (badge || copyBtn || expandBtn || moreBtn) {
    // Prevent ProseMirror from moving the selection / scrolling the editor
    // wrapper on mousedown, so the popup opens for the clicked code block.
    event.preventDefault()
    event.stopPropagation()
  }
}

function handleEditorClick(event: MouseEvent) {
  const target = event.target as HTMLElement

  const copyBtn = target.closest?.('[data-codeblock-copy-btn]') as HTMLElement | null
  if (copyBtn) {
    event.preventDefault()
    event.stopPropagation()
    const code = copyBtn.closest('pre')?.querySelector('code')?.textContent ?? ''
    navigator.clipboard.writeText(code)
    return
  }

  const expandBtn = target.closest?.('[data-codeblock-expand-btn]') as HTMLElement | null
  if (expandBtn) {
    event.preventDefault()
    event.stopPropagation()
    expandBtn.closest('pre')?.classList.toggle('is-collapsed')
    return
  }

  const badge = target.closest?.('[data-codeblock-language-badge]') as HTMLElement | null
  const moreBtn = target.closest?.('[data-codeblock-more-btn]') as HTMLElement | null
  if (badge || moreBtn) {
    event.preventDefault()
    event.stopPropagation()
    const trigger = (badge ?? moreBtn) as HTMLElement
    open(
      (trigger.closest('pre') as HTMLElement | null) ??
        (trigger.closest('.autodown-codeblock-node') as HTMLElement | null) ??
        undefined
    )
    return
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true })
  props.editor.view.dom.addEventListener('mousedown', handleEditorMouseDown, { capture: true })
  props.editor.view.dom.addEventListener('click', handleEditorClick, { capture: true })
  // The editor content is scrollable inside `.autodown-editor-content-wrapper`,
  // so we must reposition the popup when that wrapper scrolls.
  const wrapper = props.editor.view.dom.closest('.autodown-editor-content-wrapper')
  wrapper?.addEventListener('scroll', scheduleUpdate, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('wheel', handleGlobalWheel, { capture: true })
  props.editor.view.dom.removeEventListener('mousedown', handleEditorMouseDown, { capture: true })
  props.editor.view.dom.removeEventListener('click', handleEditorClick, { capture: true })
  const wrapper = props.editor.view.dom.closest('.autodown-editor-content-wrapper')
  wrapper?.removeEventListener('scroll', scheduleUpdate)
})

defineExpose({
  open,
  close,
  toggle,
})
</script>
