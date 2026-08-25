// Block host controller (plan 018 Phase 2) — the UI-free logic behind a
// per-leaf-block contenteditable host. The Vue shell (BlockHost.vue) wires
// DOM events to these methods; everything here is headless-testable.
//
// Host protocol:
// - input (outside composition): diff known text → diffToOp → engine.apply
// - Enter at offset: SplitBlock (new block focused)
// - Backspace at offset 0 with previous sibling: MergeBlocks
// - after each input, the input-rule matcher gets a chance to fire
// - composition: CompositionSession (preedit staged in DOM, commit = one op)

import {
  BlockNode,
  BlockPos,
  BlockType,
  MergeBlocksOp,
  Op,
  SplitBlockOp,
  blockText,
  findBlock,
  withChildren,
} from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { EditorEngine } from './editor-engine'
import { CompositionSession } from './composition'
import { diffToOp } from './text-diff'
import { fireRuleOn } from './input-rules'

export class BlockHostController {
  private engine: EditorEngine
  private blockId: string
  private knownText: string
  readonly composition = new CompositionSession()

  constructor(engine: EditorEngine, blockId: string) {
    this.engine = engine
    this.blockId = blockId
    const found = findBlock(engine.doc, blockId)
    this.knownText = found ? blockText(found) : ''
  }

  get id(): string {
    return this.blockId
  }

  get text(): string {
    return this.knownText
  }

  /** The host was (re)rendered from the engine — re-sync the known text
   *  (history changes repaint the host). */
  syncFromModel(): string {
    const found = findBlock(this.engine.doc, this.blockId)
    this.knownText = found ? blockText(found) : ''
    return this.knownText
  }

  /** `input` DOM event outside composition: old→new text becomes one op. */
  onInput(newText: string): Op | null {
    if (this.composition.composing) return null // preedit stays in the DOM
    const op = diffToOp(this.blockId, this.knownText, newText)
    this.knownText = newText
    if (!op) return null
    this.engine.apply(op)
    // give the input rule a chance (marker just completed)
    fireRuleOn(this.engine, this.blockId)
    this.syncFromModel()
    return op
  }

  /** Enter key at caret offset → split the block. */
  onEnter(offset: number, newId: string): void {
    this.engine.apply(Op.SplitBlock(new SplitBlockOp(new BlockPos(this.blockId, offset), newId)))
    this.knownText = ''
  }

  /** Backspace at offset 0 → merge with the previous sibling (if any). */
  onBackspaceAtStart(previousSiblingId: string | null): boolean {
    if (!previousSiblingId) return false
    this.engine.apply(Op.MergeBlocks(new MergeBlocksOp(previousSiblingId, this.blockId)))
    this.syncFromModel()
    return true
  }

  // -- composition delegates ------------------------------------------------------

  compositionBegin(baseline: string, offset: number): void {
    this.composition.begin(this.blockId, baseline, offset)
  }

  compositionUpdate(preedit: string): void {
    this.composition.update(preedit)
    // preedit is staged in the host DOM; knownText stays at the baseline
  }

  compositionCommit(finalText: string): Op | null {
    const op = this.composition.commit(finalText)
    if (op) {
      this.engine.apply(op, { coalesce: false })
      this.syncFromModel()
    }
    return op
  }

  compositionCancel(): void {
    this.composition.cancel()
  }

  /** Markdown / multiline paste: parse to blocks and insert after this one
   *  (plan 018 目标 5 — paste is v1-mandatory; HTML paste degrades to
   *  text/plain per 待澄清 5). */
  onPasteMarkdown(md: string): void {
    const parsed = parse_blocks(md, true)
    const kids = parsed.children.length > 0 ? parsed.children : []
    if (kids.length === 0) return
    const before = this.engine.doc
    const siblings = before.children
    const idx = siblings.findIndex((c) => c.id === this.blockId)
    const next = [...siblings.slice(0, idx + 1), ...kids, ...siblings.slice(idx + 1)]
    this.engine.applyTree(() => withChildren(before, next))
    this.syncFromModel()
  }
}

/** Is this block a leaf the host can edit (has inline text, no children)? */
export function isEditableLeaf(node: BlockNode): boolean {
  return node.children.length === 0 && node.kind !== BlockType.ThematicBreak
}
