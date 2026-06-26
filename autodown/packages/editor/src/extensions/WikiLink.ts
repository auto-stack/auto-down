import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import WikiLinkNodeView from '../node-views/WikiLinkNodeView.vue'

const WIKI_LINK_RE = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/g

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface WikiLinkAttrs {
  raw: string
  title: string
  blockId?: string
}

function parseRaw(raw: string): WikiLinkAttrs {
  const match = raw.match(/^\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
  if (!match) {
    return { raw, title: raw }
  }
  return {
    raw,
    title: match[1].trim(),
    blockId: match[2]?.trim(),
  }
}

export function wikiLinkToHtml(md: string): string {
  return md.replace(WIKI_LINK_RE, (raw, titleRaw, blockIdRaw) => {
    const title = titleRaw.trim()
    const blockId = blockIdRaw?.trim()
    const label = blockId ? `${title}#${blockId}` : title
    const blockAttr = blockId ? ` data-block-id="${escapeHtml(blockId)}"` : ''
    return `<span data-wikilink data-raw="${escapeHtml(raw)}" data-title="${escapeHtml(title)}"${blockAttr}>${escapeHtml(label)}</span>`
  })
}

export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      raw: {
        default: '[[Untitled]]',
        parseHTML: (element) => element.getAttribute('data-raw') || element.textContent || '[[Untitled]]',
        renderHTML: (attributes) => ({ 'data-raw': attributes.raw as string }),
      },
      title: {
        default: 'Untitled',
        parseHTML: (element) => element.getAttribute('data-title') || element.textContent || 'Untitled',
        renderHTML: (attributes) => ({ 'data-title': attributes.title as string }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id') || null,
        renderHTML: (attributes) => {
          const value = attributes.blockId as string | null | undefined
          return value ? { 'data-block-id': value } : {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
        getAttrs: (element) => {
          const raw = element.getAttribute('data-raw') || element.textContent || '[[Untitled]]'
          const parsed = parseRaw(raw)
          return { raw: parsed.raw, title: parsed.title, blockId: parsed.blockId }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as WikiLinkAttrs
    const label = attrs.blockId ? `${attrs.title}#${attrs.blockId}` : attrs.title
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-wikilink': '',
        'data-raw': attrs.raw,
        'data-title': attrs.title,
        class: 'autodown-wikilink',
      }),
      label,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(WikiLinkNodeView as any)
  },

  markdownTokenName: 'wikiLink',

  parseMarkdown(token, helpers) {
    return helpers.createNode(this.name as string, {
      raw: token.raw as string,
      title: token.title as string,
      blockId: token.blockId || null,
    })
  },

  renderMarkdown(node) {
    return (node.attrs?.raw as string) || '[[Untitled]]'
  },

  markdownTokenizer: {
    name: 'wikiLink',
    level: 'inline',
    start(src) {
      const idx = src.indexOf('[[')
      return idx === -1 ? -1 : idx
    },
    tokenize(src) {
      const match = src.match(/^\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
      if (!match) return undefined
      const raw = match[0]
      const title = match[1].trim()
      const blockId = match[2]?.trim()
      return {
        type: 'wikiLink',
        raw,
        title,
        blockId,
      }
    },
  },
})
