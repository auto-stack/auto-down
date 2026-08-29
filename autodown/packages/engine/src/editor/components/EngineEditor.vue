<template>
  <div ref="root" class="autodown-editor">
    <div ref="wrapper" class="autodown-editor-content-wrapper">
      <div class="autodown-editor-content" data-engine-editor tabindex="-1" @keydown="onContentKeydown">
        <SlashMenu :editor="adapter" :items="slashItems" />
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
import { computed, ref, watch } from 'vue'
import { BlockPos, BlockType, Selection } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { serialize } from '../../parser/serializer'
import { renderNodes } from '../../render/render-node'
import { blockNodesToWNodes } from '../../render/block-wnode'
import { h, type VNode } from 'vue'
import { EditorEngine } from '../engine/editor-engine'
import { BlockHostController, isEditableLeaf } from '../engine/host-controller'
import BlockHost from './BlockHost.vue'
import { SlashMenu, getSlashItems } from '../slash-manifest'
import { createEditorAdapter } from '../engine/tiptap-adapter'
import { decorateWikilinks } from '../wikilink'

const props = defineProps<{
  content?: string
  modelValue?: string
  placeholder?: string
  extraSlashItems?: unknown[]
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

// -- live preview assembly ----------------------------------------------------------

const repaintVersion = ref(0)

interface BlockView {
  id: string
  view: unknown
  props: Record<string, unknown>
}

const views = computed<BlockView[]>(() => {
  void repaintVersion.value
  const focusedId = engine.selection.anchor.blockId
  const preview = previewNodes.value
  let previewIdx = 0
  return engine.doc.children.map((node) => {
    const focused = node.id === focusedId
    if (focused && isEditableLeaf(node)) {
      const controller = hostFor(node.id)
      return {
        id: node.id,
        view: BlockHost,
        props: { controller, blockKind: BlockType[node.kind] },
      }
    }
    const vnode = preview[previewIdx]
    previewIdx += 1
    return {
      id: node.id,
      view: {
        render: () =>
          h('div', { class: 'node-slot', 'data-node-index': String(previewIdx - 1), 'data-node-type': BlockType[node.kind], 'data-block-id': node.id, onClick: () => selectBlock(node.id) }, [
            h('div', { class: 'node-content' }, [vnode ?? h('div', { class: 'unknown-node' }, '')]),
            h('div', { class: 'autodown-block-boundary', 'data-boundary-for': node.id }),
          ]),
      },
      props: {},
    }
  })
})

/** Preview render of the NON-focused blocks: the engine's BlockNode children
 *  go straight through the ./render pipeline via the BlockNode->WNode bridge —
 *  no serialize->parseDocument round trip (plan 023 P0T1, one pipeline for
 *  editor preview / MarkdownRender / StreamingRenderer). [[wikilinks]] stay
 *  plain text in the model; decorateWikilinks turns them into clickable
 *  labels on the returned VNodes (plan 020 Phase 3, click emits open-wiki-link). */
const previewNodes = computed<VNode[]>(() => {
  void repaintVersion.value
  const focusedId = engine.selection.anchor.blockId
  const wnodes = blockNodesToWNodes(
    engine.doc.children.filter((n) => !(n.id === focusedId && isEditableLeaf(n)))
  )
  const vnodes = renderNodes(wnodes, true)
  decorateWikilinks(vnodes, (title, blockId) => emit('open-wiki-link', title, blockId))
  return vnodes
})

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

export interface BlockInfo {
  id: string
  index: number
  pos: number
  el: HTMLElement
  top: number
  height: number
}

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
  const found = engine.doc.children.find((c) => c.id === id)
  if (found) {
    const p = new BlockPos(id, 0)
    engine.select(new Selection(p, p))
    repaintVersion.value++
  }
}

function onContentKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey && e.key === 'End') {
    e.preventDefault()
    const last = engine.doc.children[engine.doc.children.length - 1]
    if (last) selectBlock(last.id)
  }
}

function focusFirstBlock(): void {
  const first = engine.doc.children[0]
  if (first) { const p = new BlockPos(first.id, 0); engine.select(new Selection(p, p)) }
}

if (!engine.selection.anchor.blockId) focusFirstBlock()

function emitSave(): void {
  emit('save', serialize(engine.doc, true))
}

defineExpose({ getBlockMap, handleSave: emitSave })
</script>
