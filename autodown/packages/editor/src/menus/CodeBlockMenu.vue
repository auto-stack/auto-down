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

const props = defineProps<{
  editor: Editor
}>()

interface LanguageOption {
  id: string
  label: string
  aliases?: string[]
}

const languages: LanguageOption[] = [
  { id: '', label: 'Plain Text' },
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
const positionStyle = ref<Record<string, string>>({})

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
  if (langId) {
    props.editor.chain().focus().setCodeBlock({ language: langId }).run()
  } else {
    props.editor.chain().focus().setCodeBlock().run()
  }
  close()
}

function close() {
  visible.value = false
  search.value = ''
  highlightedIndex.value = 0
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

function updatePosition() {
  const { view } = props.editor
  const { state } = view
  const { selection } = state

  const node = state.doc.nodeAt(selection.from)
  if (!node || node.type.name !== 'codeBlock') {
    // Try finding the codeBlock ancestor
    let depth = selection.$from.depth
    let codeBlockPos: number | null = null
    while (depth > 0) {
      const n = selection.$from.node(depth)
      if (n.type.name === 'codeBlock') {
        codeBlockPos = selection.$from.before(depth)
        break
      }
      depth--
    }
    if (codeBlockPos === null) {
      visible.value = false
      return
    }
  }

  // Find the codeBlock DOM element
  const codeBlockEl = view.nodeDOM(selection.from) as HTMLElement | null
  if (!codeBlockEl) {
    visible.value = false
    return
  }

  const editorRect = view.dom.getBoundingClientRect()
  const codeRect = codeBlockEl.getBoundingClientRect()

  positionStyle.value = {
    top: `${codeRect.top - editorRect.top - 36}px`,
    left: `${codeRect.left - editorRect.left}px`,
  }
}

function checkVisibility() {
  const isActive = props.editor.isActive('codeBlock')
  if (!isActive) {
    if (visible.value) close()
    return
  }
  if (!visible.value) {
    visible.value = true
    nextTick(() => {
      updatePosition()
    })
  } else {
    updatePosition()
  }
}

let rafId: number | null = null
function scheduleCheck() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    checkVisibility()
    rafId = null
  })
}

watch(
  () => props.editor?.state.selection,
  scheduleCheck,
  { immediate: true }
)

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const menu = menuRef.value
  const editorEl = props.editor.view.dom
  if (menu && !menu.contains(target) && !editorEl.contains(target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>
