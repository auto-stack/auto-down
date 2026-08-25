import { mergeAttributes, Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
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

export interface WikiLinkOptions {
  openWikiLink?: (title: string, blockId?: string | null) => void
  HTMLAttributes?: Record<string, any>
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      openWikiLink: undefined,
    }
  },

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
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
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

  addProseMirrorPlugins() {
    const nodeType = this.type
    const regex = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/g
    return [
      new Plugin({
        key: new PluginKey('wikiLinkAutoConvert'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null

          let tr = newState.tr
          let modified = false
          const matches: { from: number; to: number; attrs: { raw: string; title: string; blockId: string | null } }[] = []

          newState.doc.descendants((node, pos) => {
            if (!node.isText) return true
            if (node.marks.length > 0) return false
            // Skip text inside code blocks to avoid converting literal [[...]] there.
            const parent = newState.doc.resolve(pos).parent
            if (parent.type.name === 'codeBlock') return false

            const text = node.text || ''
            let match: RegExpExecArray | null
            regex.lastIndex = 0
            while ((match = regex.exec(text)) !== null) {
              matches.push({
                from: pos + match.index,
                to: pos + match.index + match[0].length,
                attrs: {
                  raw: match[0],
                  title: match[1].trim(),
                  blockId: match[2]?.trim() || null,
                },
              })
            }
            return false
          })

          // Process from end to start so positions remain valid.
          for (let i = matches.length - 1; i >= 0; i -= 1) {
            const { from, to, attrs } = matches[i]
            tr = tr.replaceWith(from, to, nodeType.create(attrs))
            modified = true
          }

          return modified ? tr : null
        },
      }),
    ]
  },

  markdownTokenName: 'wikiLink',

  parseMarkdown(token, helpers) {
    return helpers.createNode('wikiLink', {
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
