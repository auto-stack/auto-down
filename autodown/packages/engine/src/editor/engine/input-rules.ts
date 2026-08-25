// Input rule engine (plan 018 Phase 1): markdown shortcut rules as a pure
// data table + matcher. A rule fires when the block content is exactly the
// marker (just typed) — the engine then deletes the marker and converts the
// block kind. Heading level rides the 'level' attr (see serializer).
//
// L1 (.at 单源) deferral note: the table is deliberately plain TS for v1 —
// it is 10 lines of data, the rust editor (019) has its own input stack
// (CodeEditorCore), so dual-target emission would buy nothing today. If a
// second target ever consumes this table, move it to auto/ via the
// palette_map.at pattern.

import {
  Attr,
  BlockPos,
  BlockNode,
  BlockType,
  Op,
  ReplaceRangeOp,
  Selection,
  SetBlockTypeOp,
  Value,
  attrSet,
  blockText,
  findBlock,
  replaceNode,
  withKind,
} from '../../parser/block-model'

function levelAttr(level: number): Attr {
  return { key: 'level', value: Value.Int(level) }
}

export interface InputRule {
  /** exact marker that triggers (typed at block start, whole-block) */
  marker: string
  kind: BlockType
  /** attr patch applied with the kind change (e.g. heading level) */
  level?: number
}

export const INPUT_RULES: InputRule[] = [
  { marker: '# ', kind: BlockType.Heading, level: 1 },
  { marker: '## ', kind: BlockType.Heading, level: 2 },
  { marker: '### ', kind: BlockType.Heading, level: 3 },
  { marker: '- ', kind: BlockType.ListItem },
  { marker: '* ', kind: BlockType.ListItem },
  { marker: '+ ', kind: BlockType.ListItem },
  { marker: '> ', kind: BlockType.Blockquote },
  { marker: '``` ', kind: BlockType.Fence },
  { marker: '---', kind: BlockType.ThematicBreak },
  { marker: '***', kind: BlockType.ThematicBreak },
]

/** Match a rule against the current block text (whole-block exact marker). */
export function matchInputRule(text: string): InputRule | null {
  for (const rule of INPUT_RULES) {
    if (text === rule.marker) return rule
  }
  return null
}

export interface InputRuleResult {
  /** op sequence for the engine: delete the marker, then convert the kind */
  ops: Op[]
  /** attr patch applied after the ops (heading level etc.) */
  rule: InputRule
}

/** Build the op sequence for a fired rule on the given block. */
export function inputRuleOps(tree: BlockNode, blockId: string, rule: InputRule): InputRuleResult | null {
  const found = findBlock(tree, blockId)
  if (!found) return null
  const text = blockText(found)
  if (text !== rule.marker) return null
  const sel = new Selection(new BlockPos(blockId, 0), new BlockPos(blockId, text.length))
  const ops: Op[] = [
    Op.ReplaceRange(new ReplaceRangeOp(sel, '')),
    Op.SetBlockType(new SetBlockTypeOp(blockId, rule.kind)),
  ]
  return { ops, rule }
}

/** Apply the attr patch after the ops ran (heading level etc.). */
export function applyRuleAttrs(tree: BlockNode, blockId: string, rule: InputRule): BlockNode {
  if (rule.level == null) return tree
  const found = findBlock(tree, blockId)
  if (!found) return tree
  return replaceNode(tree, blockId, [withKind({ ...found, attrs: attrSet(found.attrs, 'level', Value.Int(rule.level)) }, found.kind)])
}

/** Convenience orchestrator: fire the matching rule on the engine block as
 *  ONE undo step (marker ops + heading-level attr patch via tree fn). */
export function fireRuleOn(engine: { applyGroup(ops: Op[], after?: (tree: import('../../parser/block-model').BlockNode) => import('../../parser/block-model').BlockNode): void; doc: import('../../parser/block-model').BlockNode }, blockId: string): boolean {
  const found = findBlock(engine.doc, blockId)
  if (!found) return false
  const rule = matchInputRule(blockText(found))
  if (!rule) return false
  const res = inputRuleOps(engine.doc, blockId, rule)
  if (!res) return false
  engine.applyGroup(res.ops, (tree) => applyRuleAttrs(tree, blockId, rule))
  return true
}
