import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { AutoDownEditor } from '@autodown/editor'
import { useTabsStore } from '@/stores/tabs'
import { useFileTreeStore } from '@/stores/fileTree'
import { createWikiPage, getBlock, readWiki } from '@/lib/api'
import { headingTextToBlockId } from '@/lib/wikiLink'
import { findTemplates, stripFrontmatter, expandTemplate } from '@/lib/templates'
import { Link2, FileText } from 'lucide-vue-next'

const props = defineProps<{
  path: string
}>()

const tabs = useTabsStore()
const fileTree = useFileTreeStore()
const tab = computed(() => tabs.tabs.find(t => t.path === props.path))
const body = computed(() => tab.value?.body ?? '')
const editorRef = ref<InstanceType<typeof AutoDownEditor> | null>(null)

const hoverBlock = ref<{ id: string; top: number; left: number } | null>(null)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.path, () => {
  if (tab.value && !tab.value.loaded) {
    tabs.load(props.path)
  }
}, { immediate: true })

const debouncedSave = useDebounceFn(() => {
  if (tab.value?.dirty) tabs.save(props.path)
}, 2000)

function onUpdate(md: string) {
  tabs.setBody(props.path, md)
  debouncedSave()
}

function scrollToBlockId(id: string) {
  const wrapper = editorRef.value?.$el?.querySelector('.autodown-editor-content-wrapper')
  if (!wrapper) return
  const el = wrapper.querySelector(`[data-block-id="${id}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function normalizeBlockId(blockId: string): string {
  let id = blockId.trim()
  if (id.startsWith('^')) id = id.slice(1)
  if (/\s/.test(id)) id = headingTextToBlockId(id)
  return id
}

async function loadBlock(id: string) {
  const res = await getBlock(id)
  return res.block || null
}

const extraSlashItems = [
  {
    title: 'Template',
    description: 'Insert a template from templates/',
    icon: FileText,
    searchTerms: ['template', 'tpl'],
    command: async ({ editor, range }: any) => {
      const templates = findTemplates(fileTree.files)
      const names = templates.map((t) => t.name).join(', ') || 'none'
      const defaultName = templates[0]?.name ?? ''
      const name = window.prompt(`Template name (${names}):`, defaultName)
      if (!name) return
      const tpl = templates.find((t) => t.name.toLowerCase() === name.toLowerCase())
      let raw = ''
      if (tpl) {
        const doc = await readWiki(tpl.path)
        raw = stripFrontmatter(doc.body)
      } else {
        raw = `- ## Notes\n- <% today %>`
      }
      const expanded = expandTemplate(raw, { currentPageTitle: tab.value?.title, now: new Date() })
      editor.chain().focus().deleteRange(range).insertContent(expanded).run()
    },
  },
]

async function onOpenWikiLink(title: string, blockId?: string | null) {
  if (!fileTree.files.length && !fileTree.loading) {
    await fileTree.load()
  }

  const targetName = `${title}.ad`
  let targetPath: string | undefined

  function search(nodes: any[]): string | undefined {
    for (const node of nodes) {
      if (!node.is_dir && node.name.toLowerCase() === targetName.toLowerCase()) {
        return node.path
      }
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return undefined
  }

  targetPath = search(fileTree.files)

  if (!targetPath) {
    const ok = confirm(`页面 "${title}" 还不存在，是否创建？`)
    if (!ok) return
    try {
      targetPath = await createWikiPage(title)
      await fileTree.load()
    } catch (e) {
      alert(`创建页面失败：${e}`)
      return
    }
  }

  await tabs.open(targetPath, title)
  if (blockId) {
    const id = normalizeBlockId(blockId)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jade-scroll-to-block', { detail: { path: targetPath, id } }))
    }, 150)
  }
}

function onScrollToBlock(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail.path !== props.path) return
  scrollToBlockId(detail.id)
}

function getEditorWrapper(): HTMLElement | null {
  return editorRef.value?.$el?.querySelector('.autodown-editor-content-wrapper') ?? null
}

function findBlockElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null
  return target.closest('[data-block-id]') as HTMLElement | null
}

function onMouseMove(e: MouseEvent) {
  if (hoverTimer) clearTimeout(hoverTimer)
  const target = e.target as HTMLElement
  const blockEl = findBlockElement(target)
  if (!blockEl) {
    hoverBlock.value = null
    return
  }
  const id = blockEl.getAttribute('data-block-id')
  if (!id) {
    hoverBlock.value = null
    return
  }
  const rect = blockEl.getBoundingClientRect()
  hoverBlock.value = { id, top: rect.top, left: rect.right }
}

function onMouseLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    hoverBlock.value = null
  }, 300)
}

function copyBlockLink() {
  const id = hoverBlock.value?.id
  const title = tab.value?.title
  if (!id || !title) return
  const link = `[[${title}#^${id}]]`
  navigator.clipboard.writeText(link).catch(() => {})
  hoverBlock.value = null
}

onMounted(() => {
  window.addEventListener('jade-scroll-to-block', onScrollToBlock)
  const wrapper = getEditorWrapper()
  if (wrapper) {
    wrapper.addEventListener('mousemove', onMouseMove)
    wrapper.addEventListener('mouseleave', onMouseLeave)
  }
})

onUnmounted(() => {
  window.removeEventListener('jade-scroll-to-block', onScrollToBlock)
  if (hoverTimer) clearTimeout(hoverTimer)
  const wrapper = getEditorWrapper()
  if (wrapper) {
    wrapper.removeEventListener('mousemove', onMouseMove)
    wrapper.removeEventListener('mouseleave', onMouseLeave)
  }
})
</script>

<template>
  <div class="editor-workspace">
    <AutoDownEditor
      ref="editorRef"
      :content="body"
      :page-title="tab?.title"
      :load-block="loadBlock"
      :extra-slash-items="extraSlashItems"
      placeholder="Start typing..."
      :show-actions="false"
      class="h-full w-full"
      @update="onUpdate"
      @open-wiki-link="onOpenWikiLink"
    />
    <div
      v-show="!tab?.loaded"
      class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-muted-foreground"
    >
      Loading…
    </div>
    <teleport to="body">
      <button
        v-if="hoverBlock"
        type="button"
        class="fixed z-50 flex h-6 items-center gap-1 rounded border bg-popover px-1.5 text-[11px] text-foreground shadow-md hover:bg-accent"
        :style="{ top: `${hoverBlock.top}px`, left: `${hoverBlock.left}px` }"
        title="Copy block link"
        @click="copyBlockLink"
      >
        <Link2 class="h-3 w-3" />
        link
      </button>
    </teleport>
  </div>
</template>

<style scoped>
.editor-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.editor-workspace :deep(.autodown-editor) {
  border: none;
  border-radius: 0;
  background: transparent;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.editor-workspace :deep(.autodown-editor-content-wrapper) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}
</style>
