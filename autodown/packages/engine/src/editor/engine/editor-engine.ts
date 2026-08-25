// Editing engine session (plan 018 Phase 1) — the document model is the
// single source of truth; every mutation goes through 016 ops (applyOp).
// UI-free: the contenteditable host (Phase 2) drives this session; the
// semantics it must reproduce are pinned by __tests__/semantics.test.ts.
//
// History: snapshot per entry (preTree/preSel) + the op list to replay on
// redo. Undo restores the snapshot exactly — no inversion needed — and one
// entry can hold several ops (composed steps like input rules undo as ONE
// step). Adjacent typing coalesces into the previous entry. (016 invertOp
// stays the rust-side / streaming undo story; the session snapshot approach
// is exact by construction.)

import {
  BlockNode,
  EditResult,
  InsertTextOp,
  Op,
  Selection,
  applyOp,
  collapsedSel,
  withChildren,
} from '../../parser/block-model'

interface HistoryEntry {
  preTree: BlockNode
  preSel: Selection
  /** ops replayed (threaded) on redo, in order */
  ops: Op[]
}

export interface EngineChange {
  tree: BlockNode
  selection: Selection
  /** true when this change came from undo/redo (hosts usually skip echoing) */
  history: boolean
}

export type EngineListener = (change: EngineChange) => void

export class EditorEngine {
  private tree: BlockNode
  private sel: Selection
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private listeners: EngineListener[] = []

  constructor(tree: BlockNode, sel?: Selection) {
    this.tree = tree
    this.sel = sel ?? collapsedSel(tree.children[0]?.id ?? '', 0)
  }

  get doc(): BlockNode {
    return this.tree
  }

  get selection(): Selection {
    return this.sel
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  onChange(fn: EngineListener): void {
    this.listeners.push(fn)
  }

  /** Apply one op through the 016 kernel, recording an undo entry.
   *  Adjacent InsertText typing coalesces into the previous entry. */
  apply(op: Op, opts: { coalesce?: boolean } = {}): EditResult {
    const top = this.undoStack[this.undoStack.length - 1]
    const prev = top != null && top.ops.length === 1 ? top.ops[0] : undefined
    const coalescable =
      opts.coalesce !== false &&
      prev != null &&
      prev._tag === 'InsertText' &&
      op._tag === 'InsertText' &&
      prev.value.pos.blockId === op.value.pos.blockId &&
      prev.value.pos.offset + prev.value.text.length === op.value.pos.offset
    if (coalescable && top) {
      const before = prev!.value as InsertTextOp
      const next = op.value as InsertTextOp
      top.ops[0] = Op.InsertText(new InsertTextOp(before.pos, before.text + next.text))
    } else {
      this.undoStack.push({ preTree: this.tree, preSel: this.sel, ops: [op] })
    }
    this.redoStack = []
    const r = applyOp(this.tree, this.sel, op)
    this.tree = r.tree
    this.sel = r.selection
    this.emit(false)
    return r
  }

  /** Apply a composed op group as ONE undo step (input rules etc.). */
  applyGroup(ops: Op[]): void {
    if (ops.length === 0) return
    this.undoStack.push({ preTree: this.tree, preSel: this.sel, ops: [...ops] })
    this.redoStack = []
    this.thread(ops)
  }

  private thread(ops: Op[]): void {
    let t = this.tree
    let s = this.sel
    for (const op of ops) {
      const r = applyOp(t, s, op)
      t = r.tree
      s = r.selection
    }
    this.tree = t
    this.sel = s
  }

  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    this.redoStack.push(entry)
    this.tree = entry.preTree
    this.sel = entry.preSel
    this.emit(true)
    return true
  }

  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    const preTree = this.tree
    const preSel = this.sel
    this.thread(entry.ops)
    // the entry stays reusable for another undo→redo cycle
    this.undoStack.push({ preTree, preSel, ops: entry.ops })
    this.emit(true)
    return true
  }

  /** Streaming append (plan 018 待澄清 1 — 追加分流裁定): AI/stream blocks
   *  land at the document tail without touching the focused block or the
   *  selection; not an undoable user edit. */
  appendBlocks(blocks: BlockNode[]): void {
    if (blocks.length === 0) return
    this.tree = withChildren(this.tree, [...this.tree.children, ...blocks])
    this.emit(false)
  }

  /** External document replacement (file load, full paste). Not undoable —
   *  callers that need undo wrap it in their own op. */
  replaceDoc(tree: BlockNode, sel?: Selection): void {
    this.tree = tree
    this.sel = sel ?? collapsedSel(tree.children[0]?.id ?? '', 0)
    this.undoStack = []
    this.redoStack = []
    this.emit(false)
  }

  private emit(history: boolean): void {
    for (const fn of this.listeners) fn({ tree: this.tree, selection: this.sel, history })
  }
}
