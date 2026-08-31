<template>
  <div ref="root" class="autodown-editor">
    <div ref="wrapper" class="autodown-editor-content-wrapper">
      <div class="autodown-editor-content" data-engine-editor tabindex="-1" @keydown="onContentKeydown">
        <SlashMenu :editor="adapter" :items="slashItems" />
        <BubbleMenu :editor="adapter" />
        <!-- CodeBlockMenu anchors root-relative, mounts bare. TableMenu went
             back to dormant: its verbs were absorbed into TableEditorBlock's
             toolbar (plan 026 adjudication #1 — single table entry). -->
        <CodeBlockMenu :editor="adapter" />
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
import { registerPanel } from '../../render/panel-registry'
import { blockOfWNode } from '../../render/block-wnode'
import { CodeEditorController } from '../engine/code-editor-controller'
import { TableEditorController } from '../engine/table-editor-controller'
import { currentNodeViewHost, nodeViewProps, mountNodeView } from '../engine/node-view-host'
import CodeEditorBlock from './CodeEditorBlock.vue'
import TableEditorBlock from './TableEditorBlock.vue'
import DetailsNodeView from '../node-views/DetailsNodeView.vue'
import MathBlockNodeView from '../node-views/MathBlockNodeView.vue'
import MermaidNodeView from '../node-views/MermaidNodeView.vue'
import QueryBlockNodeView from '../node-views/QueryBlockNodeView.vue'
import BlockEmbedNodeView from '../node-views/BlockEmbedNodeView.vue'

// CodeEditorBlock is the generated widget (.at source): flat chrome props —
// the headless controller + language/code are read out of the node/ctx here.
// The .autodown-codeblock-node wrapper + language badge are the HOST side of
// the CodeBlockMenu click contract (plan 026 P2T2): the generated menu looks
// for [data-codeblock-language-badge] inside .autodown-codeblock-node /
// pre[data-language]; the wrapper carries data-language so the menu reads the
// current language off the DOM it lands on.
function fenceEditSlot(node: BlockNode, ctx: BlockEditCtx) {
  const language = attrGetStr(node.attrs, 'language', '')
  return h('div', { class: 'autodown-codeblock-node', 'data-language': language }, [
    h(
      'button',
      {
        type: 'button',
        class: 'autodown-codeblock-language-badge',
        'data-codeblock-language-badge': '',
        title: '切换语言',
      },
      language || 'text'
    ),
    h(CodeEditorBlock, {
      controller: new CodeEditorController(ctx.engine, ctx.blockId),
      blockId: ctx.blockId,
      language,
      code: blockText(node),
      readonly: ctx.readonly,
    }),
  ])
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

// Node-view preview panels (plan 026 P1T2): the generated NodeView widgets
// mount through the 017 panel registry's custom slot — same registration
// surface as the edit slots above, module scope. renderNodes/BlockType come
// from the setup script's imports (dual-script hoisting — the `h` rule).
import type { PanelRenderCtx } from '../../render/panel-registry'

/** Wrap a generated NodeView widget as a PanelRenderer: the WNode's model
 *  back-link + the current host window fabricate the tiptap-shaped props;
 *  mountNodeView feeds the NodeViewContent hole with the embedded body. */
function nodeViewPanel(view: unknown, kindValue: BlockType, childrenOf: (node: PanelRenderCtx['node']) => any[]) {
  return (ctx: PanelRenderCtx) => {
    const host = currentNodeViewHost()
    const model = blockOfWNode(ctx.node) ?? ({ id: 'nv', kind: kindValue, attrs: [], children: [], inlines: [] } as unknown as BlockNode)
    const props = nodeViewProps(model, host?.engine, false, host?.adapter)
    return mountNodeView(view, props, () => childrenOf(ctx.node))
  }
}

registerPanel(
  'Details',
  nodeViewPanel(DetailsNodeView, BlockType.Details, (node) => renderNodes((node as any).children ?? [], true)),
)

// the four render-type widgets (plan 026 P1T3): leaf source/attr blocks, no
// embedded body — the NodeViewContent hole (math/mermaid source pre) stays
// empty; attrs (query/src) drive the chrome through the same props bridge
registerPanel('MathBlock', nodeViewPanel(MathBlockNodeView, BlockType.MathBlock, () => []))
registerPanel('Mermaid', nodeViewPanel(MermaidNodeView, BlockType.Mermaid, () => []))
registerPanel('Query', nodeViewPanel(QueryBlockNodeView, BlockType.QueryBlock, () => []))
registerPanel('Embed', nodeViewPanel(BlockEmbedNodeView, BlockType.BlockEmbed, () => []))

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
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BlockPos, BlockType, Selection, attrGetBool, attrGetInt, findBlock } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { serialize } from '../../parser/serializer'
import { renderNodes } from '../../render/render-node'
import { blockNodesToWNodes } from '../../render/block-wnode'
import { editSlotFor } from '../../render/block-component'
import { h, type VNode } from 'vue'
import { EditorEngine } from '../engine/editor-engine'
import { BlockHostController, isEditableLeaf } from '../engine/host-controller'
import { historyActionOf, runHistory } from '../engine/undo-wiring'
import { focusPathOf, focusTargetOf, lastFocusTargetOf } from '../engine/focus-path'
import { domRangeToBlockRange } from '../engine/selection-map'
import BlockHost from './BlockHost.vue'
import BubbleMenu from '../menus/BubbleMenu.vue'
import CodeBlockMenu from '../menus/CodeBlockMenu.vue'
import { SlashMenu, getSlashItems } from '../slash-manifest'
import { createEditorAdapter } from '../engine/tiptap-adapter'
import { pushNodeViewHost, popNodeViewHost } from '../engine/node-view-host'
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

// Content-event dedup: `update` means the DOCUMENT CHANGED. Selection-only
// engine changes (mount-time focusFirstBlock, caret moves, history hops that
// restore the same tree) re-emit byte-identical md — consumers would run
// their save path for nothing, and jade's EditorTab handler isn't even
// initialized before the child mounts (mount-time select crashed it — found
// by the plan 026 jade e2e supplement). Seeded with the initial doc so the
// mount-time select never emits.
let lastEmittedMd: string | null = serialize(engine.doc, true)

engine.onChange(() => {
  repaintVersion.value++ // async content loads / every change repaints
  emitUpdate()
})

function emitUpdate(): void {
  // emitIds=true: re-emit persistent ^anchors from the `anchor` attr so the
  // store/save round trip never loses them (the text itself stays clean —
  // applyAnchorsDeep stripped them at parse time).
  const md = serialize(engine.doc, true)
  if (md === lastEmittedMd) return
  lastEmittedMd = md
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

// History-hop epoch (plan 028 P0T1): bumped after each undo/redo. The
// focused edit face's draft DOM (BlockHost v-html / CodeEditorBlock
// textarea) is deliberately non-reactive to protect the user's caret, so a
// restored tree would not show up in it — the epoch lands in the focused
// view's vnode key and remounts that face from the live model (fresh DOM,
// caret re-placed at end). Preview slots always re-read the model, so they
// need nothing here.
const historyEpoch = ref(0)

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

// Stable shell for the vnode-producing views (plan 025 P2T1). Handing the
// template a fresh `{ render }` object per assembly made Vue treat every
// repaint as a component-type change → the whole subtree (nested hosts
// included) unmounted and remounted on EVERY engine emit: the focused
// host's DOM was rebuilt mid-typing (trailing spaces normalized away,
// caret churn). One component type + the render closure as a prop patches
// the same instance and re-runs only the closure.
const AssemblyView = defineComponent({
  name: 'AssemblyView',
  props: { render: { type: Function, required: true } },
  setup(rp) {
    return () => (rp.render as () => VNode)()
  },
})

const views = computed<BlockView[]>(() => {
  void repaintVersion.value
  const focusedId = engine.selection.anchor.blockId
  const ctx: AssemblyCtx = { path: focusPathOf(engine.doc, focusedId), focusedId, counter: { n: 0 } }
  return engine.doc.children.map((node) => assembleView(node, ctx, true))
})

/** Preview render of an off-path subtree: BlockNode → WNode → renderNodes —
 *  no serialize->parseDocument round trip (plan 023 P0T0, one pipeline for
 *  editor preview / MarkdownRender / StreamingRenderer). [[wikilinks]] stay
 *  plain text in the model; decorateWikilinks turns them into clickable
 *  labels on the returned VNodes (plan 020 Phase 3, click emits open-wiki-link).
 *  The host window (plan 026 P1T2) scopes the mounted node-view panels to
 *  THIS editor's engine — panel renderers execute synchronously inside
 *  renderNodes, so push/pop brackets the whole conversion+render leg. */
function previewVNodeOf(node: BlockNode): VNode {
  pushNodeViewHost({ engine, adapter })
  try {
    const vnode = renderNodes(blockNodesToWNodes([node]), true)[0]
    if (vnode) decorateWikilinks([vnode], (title, blockId) => emit('open-wiki-link', title, blockId))
    return vnode ?? h('div', { class: 'unknown-node' }, '')
  } finally {
    popNodeViewHost()
  }
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
      // the innermost addressable slot wins — an expanded container's outer
      // chrome must not re-handle the bubbled click (it would resolve the
      // whole container back to its first leaf)
      onClick: (ev: MouseEvent) => {
        ev.stopPropagation()
        selectBlock(node.id)
      },
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
  return h(v.view as Parameters<typeof h>[0], v.props)
}

/** One assembled node: focused leaf → edit face / BlockHost (plan 023 P1T3
 *  contract, bare — no node-slot); focus-path container → expanded chrome;
 *  everything else → preview slot. VNode-producing views go through the
 *  stable AssemblyView shell (see its comment). */
function assembleView(node: BlockNode, ctx: AssemblyCtx, topLevel: boolean): BlockView {
  if (node.id === ctx.focusedId) {
    const edit = editSlotFor(BlockType[node.kind])
    if (edit) {
      return {
        id: node.id,
        view: AssemblyView,
        props: {
          render: () => edit(node, { engine, blockId: node.id, readonly: props.streaming === true }),
          key: `edit:${node.id}:${historyEpoch.value}`,
        },
      }
    }
    if (isEditableLeaf(node)) {
      const controller = hostFor(node.id)
      const level = node.kind === BlockType.Heading ? attrGetInt(node.attrs, 'level', 1) : undefined
      return {
        id: node.id,
        view: BlockHost,
        props: {
          controller,
          blockKind: BlockType[node.kind],
          level,
          // The face lives in the key: a kind/level flip mid-typing (input
          // rules) must REMOUNT the host. <component :is> would swap the
          // DOM element under the caret without re-running onMounted —
          // focus lands nowhere and every post-flip keystroke is lost.
          // The remount re-focuses at end (plan 029; rules match only a
          // whole-block marker, so the caret IS at end on every flip).
          key: `host:${node.id}:${BlockType[node.kind]}:${level ?? ''}:${historyEpoch.value}`,
        },
      }
    }
    // a focused non-hostable node (empty container / ThematicBreak) degrades
    // to preview — selection resolution normally never lands here
  }
  if (ctx.path.has(node.id) && isExpandableContainer(node)) {
    return {
      id: node.id,
      view: AssemblyView,
      props: { render: () => slotChrome(node, expandedElement(node, ctx), topLevel, ctx.counter) },
    }
  }
  return {
    id: node.id,
    view: AssemblyView,
    props: { render: () => slotChrome(node, previewVNodeOf(node), topLevel, ctx.counter) },
  }
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
  // undo/redo wiring (plan 028 P0T1): Ctrl/Cmd+Z (Shift variant) and
  // Ctrl/Cmd+Y. While any host is mid-composition the IME owns the key
  // stream — pass through untouched.
  const action = historyActionOf(e)
  if (action) {
    if (Array.from(hosts.values()).some((c) => c.composition.composing)) return
    e.preventDefault()
    if (runHistory(engine, hosts.values(), action)) historyEpoch.value++
    return
  }
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
