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
    <div class="autodown-codeblock-menu-list">
      <button
        v-for="(lang, idx) in filteredLanguages"
        :key="lang.id"
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
  { id: 'text', label: 'Plain Text' },
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
const search = ref('')
const highlightedIndex = ref(0)
const { positionStyle, applyPosition } = useMenuBounds(menuRef)

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
  highlightedIndex.value = 0
  nextTick(() => {
    searchRef.value?.focus()
    updatePosition()
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
  }
}

function moveUp() {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  }
}

function selectHighlighted() {
  const lang = filteredLanguages.value[highlightedIndex.value]
  if (lang) selectLanguage(lang.id)
}

function findActiveCodeBlock(): HTMLElement | null {
  const { view } = props.editor
  const { selection } = view.state
  const el = view.nodeDOM(selection.from) as HTMLElement | null
  if (!el) return null
  return el.closest?.('pre[data-language]') ?? null
}

function updatePosition() {
  const { view } = props.editor
  const editorRect = view.dom.getBoundingClientRect()

  let triggerEl = activeCodeBlock.value
  if (!triggerEl) triggerEl = findActiveCodeBlock()
  if (!triggerEl) {
    close()
    return
  }

  const triggerRect = triggerEl.getBoundingClientRect()
  const trigger: TriggerRect = {
    top: triggerRect.top - editorRect.top,
    left: triggerRect.left - editorRect.left,
    bottom: triggerRect.bottom - editorRect.top,
    right: triggerRect.right - editorRect.left,
    width: triggerRect.width,
    height: triggerRect.height,
  }

  applyPosition(
    trigger,
    { width: editorRect.width, height: editorRect.height },
    { placement: 'bottom-start', gap: 6 }
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

function handleEditorClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const badge = target.closest?.('[data-codeblock-language-badge]') as HTMLElement | null
  if (badge) {
    event.preventDefault()
    event.stopPropagation()
    open(badge.closest('pre') as HTMLElement | undefined)
    return
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  props.editor.view.dom.addEventListener('click', handleEditorClick, { capture: true })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  props.editor.view.dom.removeEventListener('click', handleEditorClick, { capture: true })
})

defineExpose({
  open,
  close,
  toggle,
})
</script>
