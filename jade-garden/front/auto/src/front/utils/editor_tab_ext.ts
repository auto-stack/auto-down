// editor_tab_ext.ts — hand-written TS extension for editor_tab.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the AutoDownEditor thin shell re-export (@autodown/editor — the gen
//   project resolves it through src/types/autodown-editor.d.ts),
// - useDebounceFn (@vueuse/core re-export, search_panel precedent),
// - HoverLinkBtn (the teleported hover button functional component, which
//   returns null when there is no hover block, i.e. the original's v-if —
//   the teleport itself is the DSL's native teleport element, compiler
//   f8acfb43; the original's v-show on the loading overlay is the
//   widget's style_obj display computed — v-show has no DSL form),
// - findTab / tabBody / tabTitle / overlayDisplay (the tab computed and its
//   derived bindings — optional chaining / ?? / === have no exact DSL form),
// - saveTabIfDirty / loadTabIfNeeded (the debounced-save guard and the
//   immediate watch body, verbatim),
// - loadBlockFn / assetUploadFn / runQueryFn / extraSlashItemsFn (the editor
//   shell function props; the slash item's command closure needs
//   window.prompt, async template expansion and `new Date`),
// - openWikiLink (the dangling-link create flow: confirm/alert,
//   try/catch, recursive tree search, setTimeout + CustomEvent dispatch),
// - listenEditorHover / unlistenEditorHover (the wrapper mousemove /
//   mouseleave listeners + the 300ms leave timer; per-tab instance state
//   travels in the returned handle, graph_view opaque-handle precedent),
// - copyBlockLinkSafe / scrollToBlockFromEvent (clipboard write, CustomEvent
//   detail, querySelector DOM walks, scrollIntoView).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h, defineComponent } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Link2, FileText } from 'lucide-vue-next'
import { AutoDownEditor } from '@autodown/editor'
import { useTabsStore } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { createWikiPage, getBlock, readWiki, uploadAsset, runQuery } from '../../../../src/lib/api'
import { headingTextToBlockId } from '../../../../src/lib/wikiLink'
import { findTemplates, stripFrontmatter, expandTemplate } from '../../../../src/lib/templates'

export { useTabsStore, useFileTreeStore, useDebounceFn }

/** Thin shell around AutoDownEditor (README gap 51): the DSL's view parser
 *  treats every prop key starting with `on` as an EVENT listener, so the
 *  shell's `onAssetUpload` prop cannot be bound from a widget. This wrapper
 *  takes the same value under `assetUpload` and forwards everything else
 *  (props, the @update listener, the @open-wiki-link listener — it lands in
 *  attrs as onOpenWikiLink and binds to the inner's declared prop, class)
 *  untouched via attrs — identical DOM, props and event wiring. It is
 *  a stateful single-root component so the parent's `ref: "editorRef"` still
 *  resolves `$el` to the editor's root element (the hover/scroll DOM escape
 *  hatch below depends on it). */
export const EditorShell = defineComponent({
  name: 'EditorShell',
  setup(_props, { attrs }) {
    return () => {
      const { assetUpload, ...rest } = attrs
      return h(AutoDownEditor as any, {
        ...rest,
        onAssetUpload: assetUpload,
      })
    }
  },
})

/** The original teleported hover button, verbatim (v-if="hoverBlock" becomes
 *  the null return; the click travels back to the widget via onCopy). The
 *  class string is scanned by Tailwind (auto/src/front/utils is in the
 *  content glob — gap 26 fix). */
export const HoverLinkBtn = (props: any) =>
  props.hb
    ? h(
        'button',
        {
          type: 'button',
          class:
            'fixed z-50 flex h-6 items-center gap-1 rounded border bg-popover px-1.5 text-[11px] text-foreground shadow-md hover:bg-accent',
          style: { top: `${props.hb.top}px`, left: `${props.hb.left}px` },
          title: 'Copy block link',
          onClick: () => props.onCopy?.(),
        },
        [h(Link2, { class: 'h-3 w-3' }), 'link'],
      )
    : null

/** Original: tab = computed(() => tabs.tabs.find(t => t.path === props.path)). */
export function findTab(tabs: any[], path: string): any {
  return (tabs ?? []).find((t) => t.path === path)
}

/** Original: body = computed(() => tab.value?.body ?? ''). */
export function tabBody(tab: any): string {
  return tab?.body ?? ''
}

/** Original template: :page-title="tab?.title". */
export function tabTitle(tab: any): string | undefined {
  return tab?.title
}

/** Original: v-show="!tab?.loaded" on the loading overlay. '' = visible
 *  (the CSS flex class applies, exactly like v-show), 'none' = hidden. */
export function overlayDisplay(tab: any): string {
  return !tab?.loaded ? '' : 'none'
}

/** Original debouncedSave body: if (tab.value?.dirty) tabs.save(props.path). */
export function saveTabIfDirty(tabs: any, path: string): void {
  const tab = (tabs.tabs ?? []).find((t: any) => t.path === path)
  if (tab?.dirty) tabs.save(path)
}

/** Original immediate watch body: if (tab.value && !tab.value.loaded)
 *  tabs.load(props.path). */
export function loadTabIfNeeded(tabs: any, tab: any, path: string): void {
  if (tab && !tab.loaded) {
    tabs.load(path)
  }
}

/** Original: async function loadBlock(id) { const res = await getBlock(id);
 *  return res.block || null }. */
export function loadBlockFn() {
  return async (id: string): Promise<any> => {
    const res = await getBlock(id)
    return res.block || null
  }
}

/** Original: async function onAssetUpload(file) { return uploadAsset(file) }. */
export function assetUploadFn() {
  return async (file: File): Promise<string> => {
    return uploadAsset(file)
  }
}

/** Original: async function onRunQuery(q) { return runQuery(q) }. */
export function runQueryFn() {
  return async (q: string): Promise<any> => {
    return runQuery(q)
  }
}

/** Original: the static extraSlashItems array (built once in setup; the
 *  command closure reads fileTree.files / the tab title lazily at execution
 *  time, exactly like the original). */
export function extraSlashItemsFn(fileTree: any, tabs: any, path: string): any[] {
  return [
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
        const tab = (tabs.tabs ?? []).find((t: any) => t.path === path)
        const expanded = expandTemplate(raw, { currentPageTitle: tab?.title, now: new Date() })
        editor.chain().focus().deleteRange(range).insertContent(expanded).run()
      },
    },
  ]
}

/** Original normalizeBlockId, verbatim. */
function normalizeBlockId(blockId: string): string {
  let id = blockId.trim()
  if (id.startsWith('^')) id = id.slice(1)
  if (/\s/.test(id)) id = headingTextToBlockId(id)
  return id
}

/** Original onOpenWikiLink, verbatim (invoked by the widget's
 *  .OpenWikiLink(title, block_id) handler — the quoted `on "open-wiki-link":`
 *  listener forwards BOTH of the inner's args since the gap-37b multi-param
 *  self-heal; the old prop-callback channel is gone). */
export async function openWikiLink(tabs: any, fileTree: any, title: string, blockId?: string | null): Promise<void> {
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

/** Original getEditorWrapper (the editorRef is already the unwrapped
 *  component instance — codegen emits editorRef.value! at the call site). */
function getEditorWrapper(editorComp: any): HTMLElement | null {
  return editorComp?.$el?.querySelector('.autodown-editor-content-wrapper') ?? null
}

/** Original findBlockElement, verbatim. */
function findBlockElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null
  return target.closest('[data-block-id]') as HTMLElement | null
}

interface HoverHandle {
  wrapper: HTMLElement
  onMove: (e: MouseEvent) => void
  onLeave: () => void
  timer: ReturnType<typeof setTimeout> | null
}

/** Original onMounted: attach onMouseMove / onMouseLeave to the editor
 *  wrapper (the handlers and the 300ms leave timer are verbatim; setHover is
 *  the widget-side closure that writes the hover_block model var). Returns
 *  null when the wrapper is missing, like the original's `if (wrapper)`
 *  guard. */
export function listenEditorHover(editorComp: any, setHover: (hb: any) => void): any {
  const wrapper = getEditorWrapper(editorComp)
  if (!wrapper) return null
  const handle: HoverHandle = { wrapper, onMove: () => {}, onLeave: () => {}, timer: null }
  handle.onMove = (e: MouseEvent) => {
    if (handle.timer) clearTimeout(handle.timer)
    const blockEl = findBlockElement(e.target)
    if (!blockEl) {
      setHover(null)
      return
    }
    const id = blockEl.getAttribute('data-block-id')
    if (!id) {
      setHover(null)
      return
    }
    const rect = blockEl.getBoundingClientRect()
    setHover({ id, top: rect.top, left: rect.right })
  }
  handle.onLeave = () => {
    if (handle.timer) clearTimeout(handle.timer)
    handle.timer = setTimeout(() => {
      setHover(null)
    }, 300)
  }
  wrapper.addEventListener('mousemove', handle.onMove)
  wrapper.addEventListener('mouseleave', handle.onLeave)
  return handle
}

/** Original onUnmounted: clear the hover timer + remove the wrapper
 *  listeners (the window listener cleanup is codegen's own onUnmounted). */
export function unlistenEditorHover(handle: any): void {
  if (!handle) return
  if (handle.timer) clearTimeout(handle.timer)
  handle.wrapper.removeEventListener('mousemove', handle.onMove)
  handle.wrapper.removeEventListener('mouseleave', handle.onLeave)
}

/** Original copyBlockLink, verbatim; returns whether the link was written
 *  (the widget clears hover_block only in that case, like the original's
 *  early return).
 *  Obsidian-mode tweak: engine-internal fallback ids (`block-N` from the
 *  parser, `b-xxxxxx` from splits) are NOT persistent anchors — copying one
 *  would produce a link that dies on reload. For not-yet-anchored blocks
 *  degrade to the page link; the slash "Block link" command assigns a real
 *  anchor on demand. */
export function copyBlockLinkSafe(hb: any, tab: any): boolean {
  const id = hb?.id
  const title = tab?.title
  if (!id || !title) return false
  if (/^(block-\d+|b-[a-z0-9]+)$/.test(id)) {
    navigator.clipboard.writeText(`[[${title}]]`).catch(() => {})
    return true
  }
  const link = `[[${title}#^${id}]]`
  navigator.clipboard.writeText(link).catch(() => {})
  return true
}

/** Original scrollToBlockId, verbatim. */
function scrollToBlockId(editorComp: any, id: string): void {
  const wrapper = getEditorWrapper(editorComp)
  if (!wrapper) return
  const el = wrapper.querySelector(`[data-block-id="${id}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** Original onScrollToBlock, verbatim. */
export function scrollToBlockFromEvent(editorComp: any, path: string, e: Event): void {
  const detail = (e as CustomEvent).detail
  if (detail.path !== path) return
  scrollToBlockId(editorComp, detail.id)
}
