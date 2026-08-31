export interface HostFace {
  tag: string
  cls: string
}

/** The focused edit host's semantic face: same tag + same class as the
 *  builtin-panels view render (h${level} + heading-node heading-${level} /
 *  p + paragraph-node), so the editor CSS hits the host exactly like the
 *  preview — parity is pinned by the wysiwyg-typography e2e computed-style
 *  assertions. Every other editable kind keeps the bare div of old. */
export function hostFaceFor(kind: string, level?: number): HostFace {
  if (kind === 'Heading') {
    const l = Math.min(6, Math.max(1, level ?? 1))
    return { tag: `h${l}`, cls: `heading-node heading-${l}` }
  }
  if (kind === 'Paragraph') return { tag: 'p', cls: 'paragraph-node' }
  return { tag: 'div', cls: '' }
}
