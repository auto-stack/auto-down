<template>
  <div ref="root" class="autodown-editor">
    <div ref="wrapper" class="autodown-editor-content-wrapper">
      <div class="autodown-editor-content" data-engine-editor tabindex="-1" @keydown="onContentKeydown">
        <SlashMenu :editor="adapter" :items="slashItems" />
        <BubbleMenu :editor="adapter" />
        <component
          :is="block.view"
          v-for="block in views"
          :key="block.id"
          v-bind="block.props"
        />
      </div>
    </div>
    <div class="autodown-editor-actions">
      <button type="button" class="autodown-editor-save" @click="emitSave">Save</button>
    </div>
  </div>
</template>

<script lang="ts">
// plan 023 P1T5/P1T7: the typed editing faces, registered at the assembly so
// every EngineEditor consumer gets them. This lives in a PLAIN script block
// because <script setup> statements compile into setup() — they would only
// run at component creation, not at import. Keys are BlockType enum names
// ('Fence' IS the code block kind); the slots carry no view, so final-state
// previews stay on the builtin panel pipeline. `h` comes from the setup
// script's vue import — dual-script imports share one module scope.
import { attrGetStr, blockText } from '../../parser/block-model'
import type { BlockNode } from '../../parser/block-model'
import { registerBlockComponent } from '../../render/block-component'
import type { BlockEditCtx } from '../../render/block-component'
import { CodeEditorController } from '../engine/code-editor-controller'
import { TableEditorController } from '../engine/table-editor-controller'
import CodeEditorBlock from './CodeEditorBlock.vue'
import TableEditorBlock from './TableEditorBlock.vue'

// CodeEditorBlock is the generated widget (.at source): flat chrome props —
// the headless controller + language/code are read out of the node/ctx here.
function fenceEditSlot(node: BlockNode, ctx: BlockEditCtx) {
  return h(CodeEditorBlock, {
    controller: new CodeEditorController(ctx.engine, ctx.blockId),
    blockId: ctx.blockId,
    language: attrGetStr(node.attrs, 'language', ''),
    code: blockText(node),
    readonly: ctx.readonly,
  })
}

registerBlockComponent('Fence', { edit: fenceEditSlot })
// TableEditorBlock is the generated widget (.at source, P1T8): flat chrome
// data — the adapter flattens the table's BlockNode into plain cell objects
// ({id, text, cls}) on every render; commands/cell-commit semantics stay on
// the TableEditorController.
function tableEditSlot(node: BlockNode, ctx: BlockEditCtx) {
  const cellData = (c: BlockNode) => ({
    id: c.id,
    text: blockText(c),
    cls: alignClass(attrGetStr(c.attrs, 'align', 'left')),
  })
  const rows = node.children
  return h(TableEditorBlock, {
    controller: new TableEditorController(ctx.engine, ctx.blockId),
    blockId: ctx.blockId,
    readonly: ctx.readonly,
    header_cells: (rows[0]?.children ?? []).map(cellData),
    body_rows: rows.slice(1).map((row) => ({ id: row.id, cells: row.children.map(cellData) })),
  })
}

function alignClass(align: string): string {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

registerBlockComponent('Table', { edit: tableEditSlot })

// frozen expose contract (EDITOR-CONTRACT.md) — declared in the plain
// script block: with dual scripts, type exports must live here, and the
// script setup below sees the module-scope type.
export interface BlockInfo {
  id: string
  index: number
  pos: number
  el: HTMLElement
  top: number
  height: number
}
</script>

<script setup lang="ts">
// EngineEditor (plan 018 Phase 2/3) — the self-built editor top level:
// per-leaf-block contenteditable hosts + the ./render pipeline for preview
// (live-preview compromise: the focused leaf block renders SOURCE, every
// other block renders PREVIEW — 块粒度 text/code 翻转, design §8 v1).
//
// Experimental parallel component during the Tiptap retirement (plan 018);
// AutoDownEditor switches to this assembly in Phase 4. The frozen external
// contract (EDITOR-CONTRACT.md) — root classes, data-block-id, getBlockMap —
// is preserved from day one.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BlockPos, BlockType, Selection, attrGetBool, attrGetInt, findBlock } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { serialize } from '../../parser/serializer'
import { renderNodes } from '../../render/render-node'
import { blockNodesToWNodes } from '../../render/block-wnode'
import { editSlotFor } from '../../render/block-component'
import { h, type VNode } from 'vue'
import { EditorEngine } from '../engine/editor-engine'
import { BlockHostController, isEditableLeaf } from '../engine/host-controller'
import { focusPathOf, focusTargetOf, lastFocusTargetOf } from '../engine/focus-path'
import { domRangeToBlockRange } from '../engine/selection-map'
import BlockHost from './BlockHost.vue'
import BubbleMenu from '../menus/BubbleMenu.vue'
import { SlashMenu, getSlashItems } from '../slash-manifest'
import { createEditorAdapter } from '../engine/tiptap-adapter'
import { decorateWikilinks } from '../wikilink'

const props = defineProps<{
  content?: string
  modelValue?: string
  placeholder?: string
  extraSlashItems?: unknown[]
  /** stream→edit v1 gate (plan 023 P2T2): while true the focused editing
   *  faces render read-only (banner + disabled) via BlockEditCtx.readonly;
   *  the stream landing flips it back and the faces unlock. */
  streaming?: boolean
}>()

const emit = defineEmits<{ (e: 'update', md: string): void; (e: 'update:modelValue', md: string): void; (e: 'save', md: string): void; (e: 'open-wiki-link', title: string, blockId?: string): void }>()

const root = ref<HTMLElement | null>(null)
const wrapper = ref<HTMLElement | null>(null)

// -- engine session ----------------------------------------------------------------

function docFromMarkdown(md: string) {
  return parse_blocks(md ?? '', true)
}

const engine = new EditorEngine(docFromMarkdown(props.modelValue ?? props.content ?? ''))
const adapter = createEditorAdapter(engine)
const slashItems = getSlashItems({ extraSlashItems: props.extraSlashItems })

engine.onChange(() => {
  repaintVersion.value++ // async content loads / every change repaints
  emitUpdate()
})

function emitUpdate(): void {
  // emitIds=true: re-emit persistent ^anchors from the `anchor` attr so the
  // store/save round trip never loses them (the text itself stays clean —
  // applyAnchorsDeep stripped them at parse time).
  const md = serialize(engine.doc, true)
  emit('update', md)
  emit('update:modelValue', md)
}

watch(
  () => props.modelValue ?? props.content,
  (md) => {
    if (md != null && md !== serialize(engine.doc, true)) engine.replaceDoc(docFromMarkdown(md))
  }
)

// -- DOM selection → engine selection bridge (plan 024 P3T2) ---------------------
// A non-collapsed selection inside a rich host maps to (blockId, lo, hi) so
// adapter.isActive / the bubble address the selected range. Collapsed carets
// deliberately do NOT sync (block-granular baseline; avoids per-keystroke
// re-emits).

function onDocSelectionChange(): void {
  const sel = typeof window === 'undefined' ? null : window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (range.collapsed) return
  const start = range.startContainer
  const startEl = start.nodeType === 3 ? start.parentElement : (start as HTMLElement)
  const hostEl = startEl?.closest<HTMLElement>('.autodown-block-host')
  if (!hostEl || !root.value?.contains(hostEl)) return
  const blockId = hostEl.dataset.blockId
  if (!blockId) return
  const br = domRangeToBlockRange(hostEl, blockId)
  if (!br || br.lo === br.hi) return
  if (engine.selection.anchor.blockId === blockId && engine.selection.anchor.offset === br.lo && engine.selection.head.offset === br.hi) return
  engine.select(new Selection(new BlockPos(blockId, br.lo), new BlockPos(blockId, br.hi)))
}

onMounted(() => document.addEventListener('selectionchange', onDocSelectionChange))
onBeforeUnmount(() => document.removeEventListener('selectionchange', onDocSelectionChange))

// -- live preview assembly ----------------------------------------------------------

const repaintVersion = ref(0)

interface BlockView {
  id: string
  view: unknown
  props: Record<string, unknown>
}

interface AssemblyCtx {
  /** ancestor ids of the focused block — these containers render expanded */
  path: Set<string>
  focusedId: string
  /** running data-node-index across the whole assembled document */
  counter: { n: number }
}

const views = computed<BlockView[]>(() => {
  void repaintVersion.value
  const focusedId = engine.selection.anchor.blockId
  const ctx: AssemblyCtx = { path: focusPathOf(engine.doc, focusedId), focusedId, counter: { n: 0 } }
  return engine.doc.children.map((node) => assembleView(node, ctx, true))
})

/** Preview render of an off-path subtree: BlockNode → WNode → renderNodes —
 *  no serialize->parseDocument round trip (plan 023 P0T1, one pipeline for
 *  editor preview / MarkdownRender / StreamingRenderer). [[wikilinks]] stay
 *  plain text in the model; decorateWikilinks turns them into clickable
 *  labels on the returned VNodes (plan 020 Phase 3, click emits open-wiki-link). */
function previewVNodeOf(node: BlockNode): VNode {
  const vnode = renderNodes(blockNodesToWNodes([node]), true)[0]
  if (vnode) decorateWikilinks([vnode], (title, blockId) => emit('open-wiki-link', title, blockId))
  return vnode ?? h('div', { class: 'unknown-node' }, '')
}

/** The node-slot chrome around every assembled node: data-block-id makes the
 *  block deep-addressable (getBlockMap + click-to-focus); the boundary
 *  marker stays top-level only (preview DOM parity with renderEmbedded). */
function slotChrome(node: BlockNode, inner: VNode, topLevel: boolean, counter: { n: number }): VNode {
  return h(
    'div',
    {
      class: 'node-slot',
      'data-node-index': String(counter.n++),
      'data-node-type': BlockType[node.kind],
      'data-block-id': node.id,
      onClick: () => selectBlock(node.id),
    },
    [
      h('div', { class: 'node-content' }, [inner]),
      ...(topLevel ? [h('div', { class: 'autodown-block-boundary', 'data-boundary-for': node.id })] : []),
    ]
  )
}

/** Expanded container element mirroring the builtin panel chrome (ul/li over
 *  markdown-renderer, blockquote likewise), children assembled recursively. */
function expandedElement(node: BlockNode, ctx: AssemblyCtx): VNode {
  if (node.kind === BlockType.Blockquote) {
    return h('blockquote', { class: 'blockquote', dir: 'auto' }, [
      h('div', { class: 'markdown-renderer' }, node.children.map((ch) => childSlot(ch, ctx))),
    ])
  }
  const ordered = attrGetBool(node.attrs, 'ordered', false)
  return h(
    ordered ? 'ol' : 'ul',
    {
      class: ordered ? 'list-node list-decimal' : 'list-node list-disc',
      ...(ordered ? { start: attrGetInt(node.attrs, 'start', 1) } : {}),
    },
    node.children.map((item) =>
      h('li', { class: 'list-item', dir: 'auto' }, [
        h('div', { class: 'markdown-renderer' }, item.children.map((ch) => childSlot(ch, ctx))),
      ])
    )
  )
}

/** A child of an expanded container: on the focus path → recursive assembly
 *  (deepest focused leaf mounts the BlockHost); off it → preview subtree in
 *  its own clickable slot. */
function childSlot(ch: BlockNode, ctx: AssemblyCtx): VNode {
  if (ch.id === ctx.focusedId || ctx.path.has(ch.id)) return viewVNode(assembleView(ch, ctx, false))
  return slotChrome(ch, previewVNodeOf(ch), false, ctx.counter)
}

function viewVNode(v: BlockView): VNode {
  if (v.view === BlockHost)
    return h(BlockHost, v.props as { controller: BlockHostController; blockKind: string })
  return (v.view as { render: () => VNode }).render()
}

/** One assembled node: focused leaf → edit face / BlockHost (plan 023 P1T3
 * contract, bare — no node-slot); focus-path container → expanded chrome;
 *  everything else → preview slot. */
function assembleView(node: BlockNode, ctx: AssemblyCtx, topLevel: boolean): BlockView {
  if (node.id === ctx.focusedId) {
    const edit = editSlotFor(BlockType[node.kind])
    if (edit) {
      return {
        id: node.id,
        view: {
          render: () => edit(node, { engine, blockId: node.id, readonly: props.streaming === true }),
        },
        props: {},
      }
    }
    if (isEditableLeaf(node)) {
      const controller = hostFor(node.id)
      return { id: node.id, view: BlockHost, props: { controller, blockKind: BlockType[node.kind] } }
    }
    // a focused non-hostable node (empty container / ThematicBreak) degrades
    // to preview — selection resolution normally never lands here
  }
  if (ctx.path.has(node.id) && isExpandableContainer(node)) {
    return { id: node.id, view: { render: () => slotChrome(node, expandedElement(node, ctx), topLevel, ctx.counter) }, props: {} }
  }
  return { id: node.id, view: { render: () => slotChrome(node, previewVNodeOf(node), topLevel, ctx.counter) }, props: {} }
}

function isExpandableContainer(node: BlockNode): boolean {
  return node.children.length > 0 && (node.kind === BlockType.ListBlock || node.kind === BlockType.Blockquote)
}

// -- host registry -------------------------------------------------------------------

const hosts = new Map<string, BlockHostController>()

function hostFor(blockId: string): BlockHostController {
  let c = hosts.get(blockId)
  if (!c) {
    c = new BlockHostController(engine, blockId)
    hosts.set(blockId, c)
  }
  return c
}

// -- frozen expose contract (EDITOR-CONTRACT.md) ---------------------------------------
// BlockInfo lives in the plain <script> block above (dual-script type exports).

/** getBlockMap parity: DOM-anchored block geometry for scroll sync. */
function getBlockMap(): BlockInfo[] {
  const out: BlockInfo[] = []
  const content = wrapper.value
  if (!content) return out
  const els = Array.from(content.querySelectorAll<HTMLElement>('[data-block-id]'))
  els.forEach((el, i) => {
    out.push({
      id: el.dataset.blockId ?? '',
      index: i,
      pos: i,
      el,
      top: el.offsetTop,
      height: el.offsetHeight,
    })
  })
  return out
}

function selectBlock(id: string): void {
  // deep selection (plan 025 P1T1): a clicked container resolves to its
  // first focusable descendant — containers never host.
  const found = findBlock(engine.doc, id)
  if (!found) return
  const target = focusTargetOf(found) ?? found
  const p = new BlockPos(target.id, 0)
  engine.select(new Selection(p, p))
  repaintVersion.value++
}

function onContentKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey && e.key === 'End') {
    e.preventDefault()
    const last = lastFocusTargetOf(engine.doc)
    if (last) selectBlock(last.id)
  }
}

function focusFirstBlock(): void {
  const first = focusTargetOf(engine.doc)
  if (first) {
    const p = new BlockPos(first.id, 0)
    engine.select(new Selection(p, p))
  }
}

focusFirstBlock()

function emitSave(): void {
  emit('save', serialize(engine.doc, true))
}

defineExpose({ getBlockMap, handleSave: emitSave })
</script>
