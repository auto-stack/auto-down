// DOM-side mark application (plan 024 P3): the bubble/shortcut toggles wrap
// the LIVE host DOM in place — the model catches up on the blur writeback
// (onRichBlur walks the wrapped DOM back into spans). The focused host is
// registered by BlockHost on focus; everything here is e2e-pinned (the
// engine test env has no DOM).

let focusedRichHost: HTMLElement | null = null

export function setFocusedRichHost(el: HTMLElement | null): void {
  focusedRichHost = el
}

export function getFocusedRichHost(): HTMLElement | null {
  return focusedRichHost
}

const TAG_ALIASES: Record<string, string[]> = {
  strong: ['strong', 'b'],
  em: ['em', 'i'],
  del: ['del', 's'],
  code: ['code'],
}

/** Active DOM Range inside the focused host, or null (no selection /
 *  collapsed / outside the host). */
function hostRange(host: HTMLElement): Range | null {
  const sel = typeof window === 'undefined' ? null : window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (range.collapsed) return null
  if (!host.contains(range.startContainer) || !host.contains(range.endContainer)) return null
  return range
}

/** Nearest ancestor of `node` (up to `host`) matching one of the tags. */
function enclosingTag(host: HTMLElement, node: Node | null, tags: string[]): HTMLElement | null {
  let n: Node | null = node
  while (n && n !== host) {
    if (n.nodeType === 1) {
      const el = n as HTMLElement
      if (tags.includes(el.tagName.toLowerCase())) return el
    }
    n = n.parentNode
  }
  return null
}

/** Toggle an inline mark on the focused host's selection. Returns false when
 *  there is no focused host / no non-collapsed selection inside it. */
export function domToggleMark(tag: keyof typeof TAG_ALIASES): boolean {
  const host = focusedRichHost
  if (!host) return false
  const range = hostRange(host)
  if (!range) return false
  const tags = TAG_ALIASES[tag]
  // unwrap when the whole selection sits inside an existing run
  const wrap = enclosingTag(host, range.startContainer, tags)
  const wrapEnd = enclosingTag(host, range.endContainer, tags)
  if (wrap && wrap === wrapEnd && wrap.contains(range.commonAncestorContainer)) {
    const parent = wrap.parentNode
    if (parent) {
      while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap)
      parent.removeChild(wrap)
      parent.normalize()
    }
    return true
  }
  const el = host.ownerDocument.createElement(tag)
  try {
    range.surroundContents(el)
  } catch {
    // range crosses element boundaries: extract + wrap + reinsert
    const frag = range.extractContents()
    el.appendChild(frag)
    range.insertNode(el)
  }
  return true
}

/** Apply a link mark on the focused host's selection (or unwrap when the
 *  selection is already a link with an href). Returns the href or null. */
export function domSetLink(href: string | null): string | null {
  const host = focusedRichHost
  if (!host) return null
  const range = hostRange(host)
  if (!range) return null
  const existing = enclosingTag(host, range.startContainer, ['a'])
  if (existing && existing === enclosingTag(host, range.endContainer, ['a'])) {
    if (href == null || href === '') {
      const parent = existing.parentNode
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing)
        parent.removeChild(existing)
      }
      return null
    }
    existing.setAttribute('href', href)
    existing.setAttribute('contenteditable', 'false')
    existing.setAttribute('data-autodown-link', '')
    return href
  }
  if (href == null || href === '') return null
  const a = host.ownerDocument.createElement('a')
  a.setAttribute('href', href)
  a.setAttribute('contenteditable', 'false')
  a.setAttribute('data-autodown-link', '')
  try {
    range.surroundContents(a)
  } catch {
    const frag = range.extractContents()
    a.appendChild(frag)
    range.insertNode(a)
  }
  return href
}
